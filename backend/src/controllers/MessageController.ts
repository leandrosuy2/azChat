import { Request, Response } from "express";
import AppError from "../errors/AppError";
import fs from "fs";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Queue from "../models/Queue";
import User from "../models/User";
import { verify } from "jsonwebtoken";
import authConfig from "../config/auth";
import path from "path";
import { isNil, isNull } from "lodash";
import { Mutex } from "async-mutex";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import CreateMessageService from "../services/MessageServices/CreateMessageService";
import Ticket from "../models/Ticket";
import { sendFacebookMessageMedia, typeAttachment } from "../services/FacebookServices/sendFacebookMessageMedia";
import sendFaceMessage from "../services/FacebookServices/sendFacebookMessage";

import ShowPlanCompanyService from "../services/CompanyService/ShowPlanCompanyService";
import ListMessagesServiceAll from "../services/MessageServices/ListMessagesServiceAll";
import ShowContactService from "../services/ContactServices/ShowContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import SendWhatsAppReaction from "../services/WbotServices/SendWhatsAppReaction";
import Contact from "../models/Contact";

import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import ShowMessageService, { GetWhatsAppFromMessage } from "../services/MessageServices/ShowMessageService";
import CompaniesSettings from "../models/CompaniesSettings";
import { verifyMessageFace } from "../services/FacebookServices/facebookMessageListener";
import EditWhatsAppMessage from "../services/MessageServices/EditWhatsAppMessage";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import { Op } from "sequelize";
import TicketQuadro from "../models/TicketQuadro";
import GetDefaultWhatsApp from "../helpers/GetDefaultWhatsApp";
import CreateTicketService from "../services/TicketServices/CreateTicketService";
import Whatsapp from "../models/Whatsapp";

type IndexQuery = {
  pageNumber: string;
  ticketTrakingId: string;
  selectedQueues?: string;
};

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}


type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
  number?: string;
  isPrivate?: string;
  vCard?: Contact;
};

const getMetaMessageId = (sentMessage: any): string | null =>
  sentMessage?.message_id || sentMessage?.mid || sentMessage?.id || null;

const createOutgoingMetaMediaMessage = async ({
  sentMessage,
  media,
  body,
  ticket
}: {
  sentMessage: any;
  media: Express.Multer.File;
  body?: string;
  ticket: Ticket;
}) => {
  const wid =
    getMetaMessageId(sentMessage) ||
    `${ticket.channel}-${ticket.id}-${Date.now()}-${media.filename}`;

  const messageData = {
    wid,
    ticketId: ticket.id,
    contactId: undefined,
    body: body || media.filename,
    fromMe: true,
    mediaType: typeAttachment(media),
    mediaUrl: media.filename,
    read: true,
    quotedMsgId: null,
    ack: 3,
    dataJson: JSON.stringify(sentMessage || {}),
    channel: ticket.channel
  };

  await CreateMessageService({ messageData, companyId: ticket.companyId });
};
export const addReaction = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {messageId} = req.params;
    const {type} = req.body; // O tipo de reação, por exemplo, 'like', 'heart', etc.
    const {companyId, id} = req.user;

    const message = await Message.findByPk(messageId);

    const ticket = await Ticket.findByPk(message.ticketId, {
      include: ["contact"]
    });

    if (!message) {
      return res.status(404).send({message: "Mensagem não encontrada"});
    }

    // Envia a reação via WhatsApp
    const reactionResult = await SendWhatsAppReaction({
      messageId: messageId,
      ticket: ticket,
      reactionType: type
    });

    // Atualiza a mensagem com a nova reação no banco de dados (opcional, dependendo da necessidade)
    /*const updatedMessage = await message.update({
      reactions: [...message.reactions, {type: type, userId: id}]
    });*/

    const io = getIO();
    io.to(message.ticketId.toString()).emit(`company-${companyId}-appMessage`, {
      action: "update",
      message
    });

    return res.status(200).send({
      message: 'Reação adicionada com sucesso!',
      reactionResult,
      //reactions: updatedMessage.reactions
    });
  } catch (error) {
    console.error('Erro ao adicionar reação:', error);
    if (error instanceof AppError) {
      return res.status(400).send({message: error.message});
    }
    return res.status(500).send({message: 'Erro ao adicionar reação', error: error.message});
  }
};
export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber, selectedQueues: queueIdsStringified } = req.query as IndexQuery;
  const { companyId, profile } = req.user;
  const tidNum = Number(ticketId);
  if (Number.isFinite(tidNum) && tidNum < 0) {
    return res.json({ count: 0, messages: [], ticket: null, hasMore: false });
  }

  let queues: number[] = [];

  const user = await User.findByPk(req.user.id, {
    include: [{ model: Queue, as: "queues" }]
  });

  if (queueIdsStringified) {
    try {
      const parsedQueues = JSON.parse(queueIdsStringified);
      if (Array.isArray(parsedQueues)) {
        queues = parsedQueues.map(Number).filter(Number.isFinite);
      }
    } catch {
      queues = [];
    }
  }

  if (queues.length === 0) {
    user.queues.forEach(queue => {
      queues.push(queue.id);
    });
  }

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId,
    companyId,
    queues,
    user
  });

  const tid = Number((ticket as Ticket)?.id);
  if (tid > 0 && (ticket as Ticket).channel === "whatsapp" && (ticket as Ticket).whatsappId) {
    SetTicketMessagesAsRead(ticket as Ticket);
  }

  return res.json({ count, messages, ticket, hasMore });
};

function obterNomeEExtensaoDoArquivo(url) {
  var urlObj = new URL(url);
  var pathname = urlObj.pathname;
  var filename = pathname.split('/').pop();
  var parts = filename.split('.');

  var nomeDoArquivo = parts[0];
  var extensao = parts[1];

  return `${nomeDoArquivo}.${extensao}`;
}

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;

  const { body, quotedMsg, vCard, isPrivate = "false" }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;

  let ticket: Ticket;
  try {
    ticket = await resolveTicketForMessageStore(ticketId, companyId, Number(req.user.id));
  } catch (e) {
    if (e instanceof AppError) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    console.error("[messages/store resolveTicket]", e);
    return res.status(500).json({ error: "Internal server error" });
  }

  if (ticket.channel === "whatsapp" && ticket.whatsappId) {
    SetTicketMessagesAsRead(ticket);
  }

  try {
    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File, index) => {
          if (ticket.channel === "whatsapp") {
            await SendWhatsAppMedia({ media, ticket, body: Array.isArray(body) ? body[index] : body, isPrivate: isPrivate === "true", isForwarded: false });
          }

          if (["facebook", "instagram"].includes(ticket.channel)) {
            try {
              const sentMedia = await sendFacebookMessageMedia({
                media,
                ticket,
                body: Array.isArray(body) ? body[index] : body
              });

              await createOutgoingMetaMediaMessage({
                sentMessage: sentMedia,
                media,
                body: Array.isArray(body) ? body[index] : body,
                ticket
              });
            } catch (error) {
              console.log(error);
            }
          }

          //limpar arquivo nao utilizado mais após envio
          const filePath = path.resolve("public", `company${companyId}`, media.filename);
          const fileExists = fs.existsSync(filePath);

          if (ticket.channel === "whatsapp" && fileExists && isPrivate === "false") {
            fs.unlinkSync(filePath);
          }
        })
      );
    } else {
      const hasBody = typeof body === "string" && body.trim().length > 0;
      const hasVCard = !isNil(vCard);

      if (ticket.channel === "whatsapp" && isPrivate === "false") {
        if (!hasBody && !hasVCard) {
          return res.send();
        }
        await SendWhatsAppMessage({ body, ticket, quotedMsg, vCard });
      } else if (ticket.channel === "whatsapp" && isPrivate === "true") {
        const messageData = {
          wid: `PVT${ticket.updatedAt.toString().replace(' ', '')}`,
          ticketId: ticket.id,
          contactId: undefined,
          body,
          fromMe: true,
          mediaType: !isNil(vCard) ? 'contactMessage' : 'extendedTextMessage',
          read: true,
          quotedMsgId: null,
          ack: 2,
          remoteJid: ticket.contact?.remoteJid,
          participant: null,
          dataJson: null,
          ticketTrakingId: null,
          isPrivate: isPrivate === "true"
        };

        await CreateMessageService({ messageData, companyId: ticket.companyId });

      } else if (["facebook", "instagram"].includes(ticket.channel)) {
        if (!hasBody) {
          return res.send();
        }
        const sendText = await sendFaceMessage({ body, ticket, quotedMsg });

        await verifyMessageFace(sendText, body, ticket, ticket.contact, true);
      }
    }
    return res.send();
  } catch (error: any) {
    console.log(error);
    const msg = error?.message ? String(error.message) : "Erro ao enviar mensagem";
    return res.status(400).json({ error: msg });
  }
};

const resolveTicketForMessageStore = async (
  ticketIdParam: string,
  companyId: number,
  userId: number
): Promise<Ticket> => {
  const tidNum = Number(ticketIdParam);
  if (!Number.isFinite(tidNum)) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }
  if (tidNum > 0) {
    return ShowTicketService(tidNum, companyId);
  }
  const standaloneId = Math.abs(tidNum);
  const quadro = await TicketQuadro.findOne({
    where: { id: standaloneId, companyId },
    attributes: ["id", "ticketId", "linkedContactId", "quadroGroupId", "nomeProjeto"]
  });
  if (!quadro) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }
  if (quadro.ticketId != null && Number(quadro.ticketId) > 0) {
    return ShowTicketService(Number(quadro.ticketId), companyId);
  }
  if (!quadro.linkedContactId || Number(quadro.linkedContactId) <= 0) {
    throw new AppError(
      "Este card não possui contato vinculado para envio de mensagem.",
      400
    );
  }
  let wppId: number | null = null;
  try {
    const wpp = await GetDefaultWhatsApp(undefined, companyId, userId);
    wppId = Number(wpp.id);
  } catch {
    // Fallback para empresas sem "default" configurado: usa qualquer conexão cadastrada.
    const anyWpp = await Whatsapp.findOne({
      where: { companyId },
      attributes: ["id"],
      order: [["id", "ASC"]]
    });
    wppId = anyWpp?.id != null ? Number(anyWpp.id) : null;
  }
  if (!wppId || Number.isNaN(wppId)) {
    throw new AppError("Nenhuma conexão WhatsApp encontrada para esta empresa.", 400);
  }

  const contactIdNum = Number(quadro.linkedContactId);
  const existing = await Ticket.findOne({
    where: {
      companyId,
      contactId: contactIdNum,
      channel: "whatsapp",
      status: { [Op.in]: ["open", "pending"] as ("open" | "pending")[] }
    },
    order: [["updatedAt", "DESC"]]
  });
  if (existing) {
    await quadro.update({ ticketId: existing.id });
    return ShowTicketService(existing.id, companyId);
  }

  const created = await CreateTicketService({
    contactId: contactIdNum,
    status: "open",
    userId,
    companyId,
    whatsappId: String(wppId),
    quadroGroupId: undefined,
    nomeProjeto: undefined,
    forceNewTicket: false
  });
  await quadro.update({ ticketId: created.id });
  return ShowTicketService(created.id, companyId);
};

export const forwardMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {

  const { quotedMsg, signMessage, messageId, contactId } = req.body;
  const { id: userId, companyId } = req.user;
  const requestUser = await User.findByPk(userId);

  if (!messageId || !contactId) {
    return res.status(200).send("MessageId or ContactId not found");
  }
  const message = await ShowMessageService(messageId);
  const contact = await ShowContactService(contactId, companyId);

  if (!message) {
    return res.status(404).send("Message not found");
  }
  if (!contact) {
    return res.status(404).send("Contact not found");
  }

  const settings = await CompaniesSettings.findOne({
    where: { companyId }
  }
  )

  const whatsAppConnectionId = await GetWhatsAppFromMessage(message);
  if (!whatsAppConnectionId) {
    return res.status(404).send('Whatsapp from message not found');
  }

  const ticket = await ShowTicketService(message.ticketId, message.companyId);

  const mutex = new Mutex();

  const createTicket = await mutex.runExclusive(async () => {
    const result = await FindOrCreateTicketService(
      contact,
      ticket?.whatsapp,
      0,
      ticket.companyId,
      ticket.queueId,
      requestUser.id,
      contact.isGroup ? contact : null,
      "whatsapp",
      null,
      true,
      settings,
      false,
      false
    );

    return result;
  });

  let ticketData;

  if (isNil(createTicket?.queueId)) {
    ticketData = {
      status: createTicket.isGroup ? "group" : "open",
      userId: requestUser.id,
      queueId: ticket.queueId
    }
  } else {
    ticketData = {
      status: createTicket.isGroup ? "group" : "open",
      userId: requestUser.id
    }
  }

  await UpdateTicketService({
    ticketData,
    ticketId: createTicket.id,
    companyId: createTicket.companyId
  });

  let body = message.body;
  if (message.mediaType === 'conversation' || message.mediaType === 'extendedTextMessage') {
    await SendWhatsAppMessage({ body, ticket: createTicket, quotedMsg, isForwarded: message.fromMe ? false : true });
  } else {

    const mediaUrl = message.mediaUrl.replace(`:${process.env.PORT}`, '');
    const fileName = obterNomeEExtensaoDoArquivo(mediaUrl);

    if (body === fileName) {
      body = "";
    }

    const publicFolder = path.join(__dirname, '..', '..', '..', 'backend', 'public');

    const filePath = path.join(publicFolder, `company${createTicket.companyId}`, fileName)

    const mediaSrc = {
      fieldname: 'medias',
      originalname: fileName,
      encoding: '7bit',
      mimetype: message.mediaType,
      filename: fileName,
      path: filePath
    } as Express.Multer.File

    await SendWhatsAppMedia({ media: mediaSrc, ticket: createTicket, body, isForwarded: message.fromMe ? false : true });
  }

  return res.send();
}

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;

  const message = await DeleteWhatsAppMessage(messageId, companyId);
  const io = getIO();

  if (message.isPrivate) {
    await Message.destroy({
      where: {
        id: message.id
      }
    });
    io.of(String(companyId))
      // .to(message.ticketId.toString())
      .emit(`company-${companyId}-appMessage`, {
        action: "delete",
        message
      });
  }

  io.of(String(companyId))
    // .to(message.ticketId.toString())
    .emit(`company-${companyId}-appMessage`, {
      action: "update",
      message
    });

  return res.send();
};

export const allMe = async (req: Request, res: Response): Promise<Response> => {

  const dateStart: any = req.query.dateStart;
  const dateEnd: any = req.query.dateEnd;
  const fromMe: any = req.query.fromMe;

  const { companyId } = req.user;

  const { count } = await ListMessagesServiceAll({
    companyId,
    fromMe,
    dateStart,
    dateEnd
  });

  return res.json({ count });
};

export const send = async (req: Request, res: Response): Promise<Response> => {
  const messageData: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  try {

    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");

    const whatsapp = await Whatsapp.findOne({ where: { token } });
    const companyId = whatsapp.companyId;
    const company = await ShowPlanCompanyService(companyId);
    const sendMessageWithExternalApi = company.plan.useExternalApi

    if (sendMessageWithExternalApi) {

      if (!whatsapp) {
        throw new Error("Não foi possível realizar a operação");
      }

      if (messageData.number === undefined) {
        throw new Error("O número é obrigatório");
      }

      const number = messageData.number;
      const body = messageData.body;

      if (medias) {
        await Promise.all(
          medias.map(async (media: Express.Multer.File) => {
            req.app.get("queues").messageQueue.add(
              "SendMessage",
              {
                whatsappId: whatsapp.id,
                data: {
                  number,
                  body: media.originalname.replace('/', '-'),
                  mediaPath: media.path
                }
              },
              { removeOnComplete: true, attempts: 3 }
            );
          })
        );
      } else {
        req.app.get("queues").messageQueue.add(
          "SendMessage",
          {
            whatsappId: whatsapp.id,
            data: {
              number,
              body
            }
          },
          { removeOnComplete: true, attempts: 3 }
        );
      }
      return res.send({ mensagem: "Mensagem enviada!" });
    }
    return res.status(400).json({ error: 'Essa empresa não tem permissão para usar a API Externa. Entre em contato com o Suporte para verificar nossos planos!' });

  } catch (err: any) {

    console.log(err);
    if (Object.keys(err).length === 0) {
      throw new AppError(
        "Não foi possível enviar a mensagem, tente novamente em alguns instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};

export const edit = async (req: Request, res: Response): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;
  const { body }: MessageData = req.body;

  const { ticket, message } = await EditWhatsAppMessage({ messageId, body });

  const io = getIO();
  io.of(String(companyId))
    // .to(String(ticket.id))
    .emit(`company-${companyId}-appMessage`, {
      action: "update",
      message
    });

  io.of(String(companyId))
    // .to(ticket.status)
    // .to("notification")
    // .to(String(ticket.id))
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });
  return res.send();
}

export const sendMessageFlow = async (
  whatsappId: number,
  body: any,
  req: Request,
  files?: Express.Multer.File[]
): Promise<String> => {
  const messageData = body;
  const medias = files;

  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      throw new Error("Não foi possível realizar a operação");
    }

    if (messageData.number === undefined) {
      throw new Error("O número é obrigatório");
    }

    const numberToTest = messageData.number;
    const body = messageData.body;

    const companyId = messageData.companyId;

    const CheckValidNumber = await CheckContactNumber(numberToTest, companyId);
    const number = CheckValidNumber.replace(/\D/g, "");

    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File) => {
          await req.app.get("queues").messageQueue.add(
            "SendMessage",
            {
              whatsappId,
              data: {
                number,
                body: media.originalname,
                mediaPath: media.path
              }
            },
            { removeOnComplete: true, attempts: 3 }
          );
        })
      );
    } else {
      req.app.get("queues").messageQueue.add(
        "SendMessage",
        {
          whatsappId,
          data: {
            number,
            body
          }
        },

        { removeOnComplete: false, attempts: 3 }
      );
    }

    return "Mensagem enviada";
  } catch (err: any) {
    if (Object.keys(err).length === 0) {
      throw new AppError(
        "Não foi possível enviar a mensagem, tente novamente em alguns instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};
