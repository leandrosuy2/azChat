import * as Sentry from "@sentry/node";
import makeWASocket, {
  AuthenticationState,
  Browsers,
  DisconnectReason,
  WAMessage,
  WAMessageKey,
  WASocket,
  isJidBroadcast,
  isJidGroup,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import { FindOptions } from "sequelize/types";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";
import MAIN_LOGGER from "@whiskeysockets/baileys/lib/Utils/logger";
import { useMultiFileAuthState } from "../helpers/useMultiFileAuthState";
import { Boom } from "@hapi/boom";
import AppError from "../errors/AppError";
import { getIO } from "./socket";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import cacheLayer from "./cache";
import ImportWhatsAppMessageService from "../services/WhatsappService/ImportWhatsAppMessageService";
import { add } from "date-fns";
import moment from "moment";
import { getTypeMessage, isValidMsg } from "../services/WbotServices/wbotMessageListener";
import { addLogs } from "../helpers/addLogs";
import NodeCache from "node-cache";
import { Store } from "./store";
import { setDefaultResultOrder } from "node:dns"; // Node >= 18

const msgRetryCounterCache = new NodeCache({
  stdTTL: 600,
  maxKeys: 1000,
  checkperiod: 300,
  useClones: false
});
const msgCache = new NodeCache({
  stdTTL: 60,
  maxKeys: 1000,
  checkperiod: 300,
  useClones: false
});

const loggerBaileys = MAIN_LOGGER.child({});
// "skmsg: No session found to decrypt message" e "transaction failed, rolling back"
// são ruído normal do Baileys em grupos — silenciamos para não inundar pm2 logs.
// Mudanças de conexão e erros de envio continuam visíveis via nosso logger principal.
loggerBaileys.level = "silent";

/**
 * Cap defensivo: tamanho máximo do buffer in-memory por whatsappId em dataMessages.
 * Sem isso, importações grandes (messaging-history.set) crescem indefinidamente.
 */
const IMPORT_BUFFER_MAX_PER_WPP = 20_000;

// Força resolver IPv4 primeiro (evita handshakes quebrando em IPv6)
setDefaultResultOrder?.("ipv4first");

type Session = WASocket & {
  id?: number;
  store?: Store;
};

const sessions: Session[] = [];

const retriesQrCodeMap = new Map<number, number>();

// Contador de tentativas de reconexão por whatsappId — usado para backoff
// exponencial. Resetado ao receber connection "open".
const reconnectAttempts = new Map<number, number>();

export default function msg() {
  return {
    get: (key: WAMessageKey) => {
      const { id } = key;
      if (!id) return;
      const data = msgCache.get(id);
      if (data) {
        try {
          const msg = JSON.parse(data as string);
          return msg?.message;
        } catch (error) {
          logger.error(error);
        }
      }
    },
    save: (msg: WAMessage) => {
      const { id } = msg.key;
      const msgtxt = JSON.stringify(msg);
      try {
        msgCache.set(id as string, msgtxt);
      } catch (error) {
        logger.error(error);
      }
    }
  };
}

export const getWbot = (whatsappId: number): Session => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
  if (sessionIndex === -1) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }
  return sessions[sessionIndex];
};

export const restartWbot = async (
  companyId: number,
  session?: any
): Promise<void> => {
  try {
    const options: FindOptions = {
      where: { companyId },
      attributes: ["id"]
    };

    const whatsapp = await Whatsapp.findAll(options);

    whatsapp.map(async c => {
      const sessionIndex = sessions.findIndex(s => s.id === c.id);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].ws.close();
      }
    });
  } catch (err) {
    logger.error(err);
  }
};

export const removeWbot = async (
  whatsappId: number,
  isLogout = true
): Promise<void> => {
  try {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex !== -1) {
      if (isLogout) {
        sessions[sessionIndex].logout();
        sessions[sessionIndex].ws.close();
      }
      sessions.splice(sessionIndex, 1);
    }
  } catch (err) {
    logger.error(err);
  }
};

export var dataMessages: any = {};

export const msgDB = msg();

export const initWASocket = async (whatsapp: Whatsapp): Promise<Session> => {
  return new Promise(async (resolve, reject) => {
    try {
      (async () => {
        const io = getIO();

        const whatsappUpdate = await Whatsapp.findOne({
          where: { id: whatsapp.id }
        });
        if (!whatsappUpdate) return;

        const { id, name, allowGroup, companyId } = whatsappUpdate;

        logger.info(`Starting session ${name}`);
        let retriesQrCode = 0;

        let wsocket: Session = null;
        const { state, saveCreds } = await useMultiFileAuthState(whatsapp);

        // Usa a versão oficial do WhatsApp Web suportada pelo Baileys
        const { version } = await fetchLatestBaileysVersion();
        // logger.info(`Baileys using WA Web version ${version.join(".")}`);

        wsocket = makeWASocket({
          version,
          logger: loggerBaileys,
          printQRInTerminal: false,
          auth: {
            creds: state.creds,
            /** caching makes the store faster to send/recv messages */
            keys: makeCacheableSignalKeyStore(state.keys, logger)
          },
          generateHighQualityLinkPreview: true,
          linkPreviewImageThumbnailWidth: 192,
          shouldIgnoreJid: jid =>
            isJidBroadcast(jid) || (!allowGroup && isJidGroup(jid)),
          browser: Browsers.appropriate("Chrome"),
          defaultQueryTimeoutMs: 60_000,
          msgRetryCounterCache,
          markOnlineOnConnect: false,
          retryRequestDelayMs: 500,
          maxMsgRetryCount: 5,
          emitOwnEvents: true,
          fireInitQueries: true,
          transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
          connectTimeoutMs: 30_000,
          // Keepalive curto: detecta desconexão zumbi (NAT timeout, wifi caindo)
          // antes do WhatsApp marcar como ofline. Era um dos motivos de "mensagens
          // chegam no celular mas não no painel".
          keepAliveIntervalMs: 20_000,
          // Sincroniza histórico completo na conexão inicial. Sem isso, depois de
          // um restart só as mensagens muito recentes voltam via messaging-history.set.
          shouldSyncHistoryMessage: () => true,
          syncFullHistory: true,
          getMessage: msgDB.get
        });

        setTimeout(async () => {
          const wpp = await Whatsapp.findByPk(whatsapp.id);
          if (wpp?.importOldMessages && wpp.status === "CONNECTED") {
            const dateOldLimit = new Date(wpp.importOldMessages).getTime();
            const dateRecentLimit = new Date(wpp.importRecentMessages).getTime();

            addLogs({
              fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`,
              forceNewFile: true,
              text: `Aguardando conexão para iniciar a importação de mensagens:
  Whatsapp nome: ${wpp.name}
  Whatsapp Id: ${wpp.id}
  Criação do arquivo de logs: ${moment().format("DD/MM/YYYY HH:mm:ss")}
  Selecionado Data de inicio de importação: ${moment(dateOldLimit).format("DD/MM/YYYY HH:mm:ss")} 
  Selecionado Data final da importação: ${moment(dateRecentLimit).format("DD/MM/YYYY HH:mm:ss")} 
  `
            });

            const statusImportMessages = new Date().getTime();

            await wpp.update({ statusImportMessages });

            wsocket.ev.on("messaging-history.set", async (messageSet: any) => {
              const statusImportMessages = new Date().getTime();
              await wpp.update({ statusImportMessages });

              const whatsappId = whatsapp.id;
              const filteredMessages = messageSet.messages;
              const filteredDateMessages: any[] = [];

              filteredMessages.forEach(msg => {
                const timestampMsg = Math.floor(
                  msg.messageTimestamp["low"] * 1000
                );
                if (
                  isValidMsg(msg) &&
                  dateOldLimit < timestampMsg &&
                  dateRecentLimit > timestampMsg
                ) {
                  if (msg.key?.remoteJid.split("@")[1] !== "g.us") {
                    addLogs({
                      fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`,
                      text: `Adicionando mensagem para pos processamento:
  Não é Mensagem de GRUPO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  Data e hora da mensagem: ${moment(timestampMsg).format(
                        "DD/MM/YYYY HH:mm:ss"
                      )}
  Contato da Mensagem : ${msg.key?.remoteJid}
  Tipo da mensagem : ${getTypeMessage(msg)}
  
  `
                    });
                    filteredDateMessages.push(msg);
                  } else {
                    if (wpp?.importOldMessagesGroups) {
                      addLogs({
                        fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`,
                        text: `Adicionando mensagem para pos processamento:
  Mensagem de GRUPO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  Data e hora da mensagem: ${moment(timestampMsg).format(
                          "DD/MM/YYYY HH:mm:ss"
                        )}
  Contato da Mensagem : ${msg.key?.remoteJid}
  Tipo da mensagem : ${getTypeMessage(msg)}
  
  `
                      });
                      filteredDateMessages.push(msg);
                    }
                  }
                }
              });

              if (!dataMessages?.[whatsappId]) {
                dataMessages[whatsappId] = [];
              }
              dataMessages[whatsappId].unshift(...filteredDateMessages);
              if (dataMessages[whatsappId].length > IMPORT_BUFFER_MAX_PER_WPP) {
                const dropped =
                  dataMessages[whatsappId].length - IMPORT_BUFFER_MAX_PER_WPP;
                dataMessages[whatsappId].length = IMPORT_BUFFER_MAX_PER_WPP;
                logger.warn(
                  `[Import wpp=${whatsappId}] buffer cheio, descartando ${dropped} mensagens mais antigas para evitar OOM`
                );
              }

              setTimeout(async () => {
                const wpp = await Whatsapp.findByPk(whatsappId);

                io.of(String(companyId)).emit(
                  `importMessages-${wpp.companyId}`,
                  {
                    action: "update",
                    status: { this: -1, all: -1 }
                  }
                );

                io
                  .of(String(companyId))
                  .emit(`company-${companyId}-whatsappSession`, {
                    action: "update",
                    session: wpp
                  });
              }, 500);

              setTimeout(async () => {
                const wpp = await Whatsapp.findByPk(whatsappId);

                if (wpp?.importOldMessages) {
                  const isTimeStamp = !isNaN(
                    new Date(
                      Math.floor(parseInt(wpp?.statusImportMessages))
                    ).getTime()
                  );

                  if (isTimeStamp) {
                    const ultimoStatus = new Date(
                      Math.floor(parseInt(wpp?.statusImportMessages))
                    ).getTime();
                    const dataLimite =
                      +add(ultimoStatus, { seconds: +45 }).getTime();

                    if (dataLimite < new Date().getTime()) {
                      ImportWhatsAppMessageService(wpp.id);
                      wpp.update({ statusImportMessages: "Running" });
                    }
                  }
                }

                io
                  .of(String(companyId))
                  .emit(`company-${companyId}-whatsappSession`, {
                    action: "update",
                    session: wpp
                  });
              }, 1000 * 45);
            });
          }
        }, 2500);

        // ====== CONNECTION.UPDATE COM LOG DETALHADO E REAÇÕES CORRETAS ======
        wsocket.ev.on(
          "connection.update",
          async ({ connection, lastDisconnect, qr }) => {
            logger.info(
              `Socket ${name} Connection Update ${connection || ""} ${lastDisconnect ? (lastDisconnect as any).error?.message : ""
              }`
            );

            if (connection === "close") {
              const boom = lastDisconnect?.error as Boom | undefined;
              const code = boom?.output?.statusCode;
              const reason =
                (DisconnectReason as any)?.[
                code as unknown as keyof typeof DisconnectReason
                ] ?? code;

              console.log("connection.update close =>", {
                code,
                reason,
                msg: boom?.message
              });

              // 403: acesso proibido (muitas vezes precisa relogar)
              if (code === 403) {
                await whatsapp.update({ status: "PENDING", session: "" });
                await DeleteBaileysService(whatsapp.id);
                await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
                getIO()
                  .of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });
                removeWbot(id, false);
                setTimeout(
                  () => StartWhatsAppSession(whatsapp, whatsapp.companyId),
                  2000
                );
                return;
              }

              // Sessão inválida/deslogada → limpar pra gerar novo QR
              if (
                code === DisconnectReason.loggedOut ||
                code === DisconnectReason.badSession
              ) {
                await whatsapp.update({ status: "PENDING", session: "" });
                await DeleteBaileysService(whatsapp.id);
                await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
                getIO()
                  .of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });
                removeWbot(id, false);
                setTimeout(
                  () => StartWhatsAppSession(whatsapp, whatsapp.companyId),
                  2000
                );
                return;
              }

              /**
               * 440 / connectionReplaced: outra socket (outro processo, outro servidor ou outro ambiente)
               * autenticou com a mesma conta. Reconectar em loop aqui só disputa a sessão com a outra instância.
               */
              if (
                code === DisconnectReason.connectionReplaced ||
                code === 440
              ) {
                logger.warn(
                  `[WhatsApp ${name} #${id}] connectionReplaced (440): outra instância está usando esta mesma conta ao mesmo tempo. ` +
                    "Causa típica: dois backends (teste + produção) com o mesmo banco/pasta de sessão, ou o mesmo número conectado em dois servidores. " +
                    "Reconexão automática foi interrompida para evitar loop. Encerre a outra sessão ou separe ambientes; reconecte pelo painel quando só houver uma instância ativa."
                );
                await whatsapp.update({
                  status: "DISCONNECTED",
                  qrcode: ""
                });
                removeWbot(id, false);
                const sessionFresh = await Whatsapp.findByPk(id);
                getIO()
                  .of(String(companyId))
                  .emit(`company-${companyId}-whatsappSession`, {
                    action: "update",
                    session: sessionFresh ?? whatsapp
                  });
                return;
              }

              // Outros motivos (428 connectionClosed, 408 timeout, 500 streamErrored)
              // → reconectar com backoff exponencial limitado para não martelar
              // o WhatsApp Web quando há instabilidade de rede.
              const prevAttempts = reconnectAttempts.get(id) ?? 0;
              const nextAttempts = prevAttempts + 1;
              reconnectAttempts.set(id, nextAttempts);
              const backoffMs = Math.min(
                2_000 * Math.pow(2, prevAttempts),
                60_000
              );
              logger.info(
                `[WhatsApp ${name} #${id}] reconectando em ${backoffMs}ms (tentativa ${nextAttempts}) code=${code}`
              );
              removeWbot(id, false);
              setTimeout(
                () => StartWhatsAppSession(whatsapp, whatsapp.companyId),
                backoffMs
              );
            }

            if (connection === "open") {
              // Reseta contador de backoff — próxima queda volta a tentar em 2s.
              reconnectAttempts.delete(id);

              await whatsapp.update({
                status: "CONNECTED",
                qrcode: "",
                retries: 0,
                number:
                  wsocket.type === "md"
                    ? jidNormalizedUser((wsocket as WASocket).user.id).split(
                      "@"
                    )[0]
                    : "-"
              });

              getIO()
                .of(String(companyId))
                .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                  action: "update",
                  session: whatsapp
                });

              const sessionIndex = sessions.findIndex(
                s => s.id === whatsapp.id
              );
              if (sessionIndex === -1) {
                wsocket.id = whatsapp.id;
                sessions.push(wsocket);
              }

              resolve(wsocket);
            }

            if (qr !== undefined) {
              if (
                retriesQrCodeMap.get(id) &&
                retriesQrCodeMap.get(id) >= 3
              ) {
                await whatsappUpdate.update({
                  status: "DISCONNECTED",
                  qrcode: ""
                });
                await DeleteBaileysService(whatsappUpdate.id);
                await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
                getIO()
                  .of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsappUpdate
                  });
                wsocket.ev.removeAllListeners("connection.update");
                wsocket.ws.close();
                wsocket = null;
                retriesQrCodeMap.delete(id);
              } else {
                logger.info(`Session QRCode Generate ${name}`);
                retriesQrCodeMap.set(id, (retriesQrCode += 1));

                await whatsapp.update({
                  qrcode: qr,
                  status: "qrcode",
                  retries: 0,
                  number: ""
                });

                const sessionIndex = sessions.findIndex(
                  s => s.id === whatsapp.id
                );
                if (sessionIndex === -1) {
                  wsocket.id = whatsapp.id;
                  sessions.push(wsocket);
                }

                getIO()
                  .of(String(companyId))
                  .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                    action: "update",
                    session: whatsapp
                  });
              }
            }
          }
        );

        wsocket.ev.on("creds.update", saveCreds);
        // Se quiser reativar store no futuro:
        // wsocket.store = store;
        // store.bind(wsocket.ev);
      })();
    } catch (error) {
      Sentry.captureException(error);
      console.log(error);
      reject(error);
    }
  });
};
