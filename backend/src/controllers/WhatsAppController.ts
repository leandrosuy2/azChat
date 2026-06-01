import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import cacheLayer from "../libs/cache";
import { removeWbot, restartWbot } from "../libs/wbot";
import Whatsapp from "../models/Whatsapp";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import AppError from "../errors/AppError";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import { exchangeForLongLivedUserToken, getPageProfile, subscribeApp } from "../services/FacebookServices/graphAPI";
import ShowPlanService from "../services/PlanService/ShowPlanService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import { closeTicketsImported } from "../services/WhatsappService/ImportWhatsAppMessageService";
import ShowWhatsAppServiceAdmin from "../services/WhatsappService/ShowWhatsAppServiceAdmin";
import UpdateWhatsAppServiceAdmin from "../services/WhatsappService/UpdateWhatsAppServiceAdmin";
import ListAllWhatsAppsService from "../services/WhatsappService/ListAllWhatsAppService";
import ListFilterWhatsAppsService from "../services/WhatsappService/ListFilterWhatsAppsService";
import User from "../models/User";
import SyncInstagramDmsService from "../services/FacebookServices/SyncInstagramDmsService";
import {
  exchangeForLongLivedInstagramToken,
  exchangeInstagramCodeForToken,
  getInstagramMe,
  subscribeInstagramDirectApp
} from "../services/InstagramServices/instagramAPI";

interface WhatsappData {
  name: string;
  queueIds: number[];
  companyId: number;
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  status?: string;
  isDefault?: boolean;
  token?: string;
  maxUseBotQueues?: string;
  timeUseBotQueues?: string;
  expiresTicket?: number;
  allowGroup?: false;
  sendIdQueue?: number;
  timeSendQueue?: number;
  timeInactiveMessage?: string;
  inactiveMessage?: string;
  ratingMessage?: string;
  maxUseBotQueuesNPS?: number;
  expiresTicketNPS?: number;
  whenExpiresTicket?: string;
  expiresInactiveMessage?: string;
  importOldMessages?: string;
  importRecentMessages?: string;
  importOldMessagesGroups?: boolean;
  closedTicketsPostImported?: boolean;
  groupAsTicket?: string;
  timeCreateNewTicket?: number;
  schedules?: any[];
  promptId?: number;
  collectiveVacationMessage?: string;
  collectiveVacationStart?: string;
  collectiveVacationEnd?: string;
  queueIdImportMessages?: number;
  flowIdNotPhrase?: number;
  flowIdWelcome?: number;
}

interface QueryParams {
  session?: number | string;
  channel?: string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { session } = req.query as QueryParams;
  const whatsapps = await ListWhatsAppsService({ companyId, session });

  return res.status(200).json(whatsapps);
};

export const indexFilter = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { session, channel } = req.query as QueryParams;

  const whatsapps = await ListFilterWhatsAppsService({ companyId, session, channel });

  return res.status(200).json(whatsapps);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    status,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    queueIds,
    token,
    maxUseBotQueues,
    timeUseBotQueues,
    expiresTicket,
    allowGroup,
    timeSendQueue,
    sendIdQueue,
    timeInactiveMessage,
    inactiveMessage,
    ratingMessage,
    maxUseBotQueuesNPS,
    expiresTicketNPS,
    whenExpiresTicket,
    expiresInactiveMessage,
    importOldMessages,
    importRecentMessages,
    closedTicketsPostImported,
    importOldMessagesGroups,
    groupAsTicket,
    timeCreateNewTicket,
    schedules,
    promptId,
    collectiveVacationEnd,
    collectiveVacationMessage,
    collectiveVacationStart,
    queueIdImportMessages,
    flowIdNotPhrase,
    flowIdWelcome
  }: WhatsappData = req.body;
  const { companyId } = req.user;

  const company = await ShowCompanyService(companyId)
  const plan = await ShowPlanService(company.planId);

  if (!plan.useWhatsapp) {
    return res.status(400).json({
      error: "Você não possui permissão para acessar este recurso!"
    });
  }

  console.log("================ WhatsAppController ==============")
  console.log(req.body)
  console.log("==================================================")

  const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
    name,
    status,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    queueIds,
    companyId,
    token,
    maxUseBotQueues,
    timeUseBotQueues,
    expiresTicket,
    allowGroup,
    timeSendQueue,
    sendIdQueue,
    timeInactiveMessage,
    inactiveMessage,
    ratingMessage,
    maxUseBotQueuesNPS,
    expiresTicketNPS,
    whenExpiresTicket,
    expiresInactiveMessage,
    importOldMessages,
    importRecentMessages,
    closedTicketsPostImported,
    importOldMessagesGroups,
    groupAsTicket,
    timeCreateNewTicket,
    schedules,
    promptId,
    collectiveVacationEnd,
    collectiveVacationMessage,
    collectiveVacationStart,
    queueIdImportMessages,
    flowIdNotPhrase,
    flowIdWelcome
  });

  StartWhatsAppSession(whatsapp, companyId);

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-whatsapp`, {
      action: "update",
      whatsapp
    });

  if (oldDefaultWhatsapp) {
    io.of(String(companyId))
      .emit(`company-${companyId}-whatsapp`, {
        action: "update",
        whatsapp: oldDefaultWhatsapp
      });
  }

  return res.status(200).json(whatsapp);

};

export const storeFacebook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      facebookUserId,
      facebookUserToken,
      addInstagram
    }: {
      facebookUserId: string;
      facebookUserToken: string;
      addInstagram: boolean;
    } = req.body;
    const { companyId } = req.user;

    // const company = await ShowCompanyService(companyId)
    // const plan = await ShowPlanService(company.planId);

    // if (!plan.useFacebook) {
    //   return res.status(400).json({
    //     error: "Você não possui permissão para acessar este recurso!"
    //   });
    // }

    const longLivedUserToken = await exchangeForLongLivedUserToken(facebookUserToken);

    const { data } = await getPageProfile(facebookUserId, longLivedUserToken);

    if (data.length === 0) {
      return res.status(400).json({
        error: addInstagram
          ? "Nenhuma Página Facebook encontrada. Para conectar Instagram, o perfil precisa estar vinculado a uma Página Facebook que você administra."
          : "Nenhuma Página Facebook encontrada para este usuário."
      });
    }
    const io = getIO();

    const pages = [];
    let instagramConnections = 0;
    for await (const page of data) {
      const { name, access_token, id, instagram_business_account } = page;

      const acessTokenPage = access_token;

      if (instagram_business_account && addInstagram) {
        const { id: instagramId, username, name: instagramName } = instagram_business_account;

        pages.push({
          companyId,
          name: `Insta ${username || instagramName}`,
          facebookUserId: facebookUserId,
          facebookPageUserId: instagramId,
          facebookUserToken: acessTokenPage,
          tokenMeta: longLivedUserToken,
          isDefault: false,
          channel: "instagram",
          status: "CONNECTED",
          greetingMessage: "",
          farewellMessage: "",
          queueIds: [],
          isMultidevice: false
        });
        instagramConnections += 1;
      }

      pages.push({
        companyId,
        name,
        facebookUserId: facebookUserId,
        facebookPageUserId: id,
        facebookUserToken: acessTokenPage,
        tokenMeta: longLivedUserToken,
        isDefault: false,
        channel: "facebook",
        status: "CONNECTED",
        greetingMessage: "",
        farewellMessage: "",
        queueIds: [],
        isMultidevice: false
      });

      await subscribeApp(id, acessTokenPage);

    }

    if (addInstagram && instagramConnections === 0) {
      return res.status(400).json({
        error: "Nenhuma conta Instagram Business ou Creator vinculada às Páginas Facebook encontradas. Vincule o Instagram à Página no painel do Facebook e tente novamente."
      });
    }

    for await (const pageConection of pages) {

      const exist = await Whatsapp.findOne({
        where: {
          facebookPageUserId: pageConection.facebookPageUserId
        }
      });

      let connection: Whatsapp;
      if (exist) {
        await exist.update({
          facebookUserId: pageConection.facebookUserId,
          facebookUserToken: pageConection.facebookUserToken,
          tokenMeta: pageConection.tokenMeta,
          status: "CONNECTED",
          channel: pageConection.channel
        });
        connection = exist;
      } else {
        const { whatsapp } = await CreateWhatsAppService(pageConection);
        connection = whatsapp;

        // Adopta tickets/contatos órfãos do mesmo canal/empresa
        // (caso o usuário tenha deletado a conexão antes e reconectado)
        const [adoptedContacts] = await Contact.update(
          { whatsappId: connection.id },
          {
            where: {
              companyId,
              channel: pageConection.channel,
              whatsappId: null
            }
          }
        );
        const [adoptedTickets] = await Ticket.update(
          { whatsappId: connection.id },
          {
            where: {
              companyId,
              channel: pageConection.channel,
              whatsappId: null
            }
          }
        );
        if (adoptedContacts || adoptedTickets) {
          console.log(
            `[storeFacebook] reconexão ${pageConection.channel} id=${connection.id} adotou ${adoptedContacts} contato(s) e ${adoptedTickets} ticket(s) órfão(s)`
          );
        }
      }

      io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
        action: "update",
        whatsapp: connection
      });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      error: error?.message || "Erro ao conectar Facebook/Instagram"
    });
  }
};

export const storeInstagramDirect = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      code,
      redirectUri
    }: {
      code: string;
      redirectUri: string;
    } = req.body;
    const { companyId } = req.user;

    if (!code || !redirectUri) {
      return res.status(400).json({
        error: "Código de autorização do Instagram ausente."
      });
    }

    let shortLivedTokenData: any;
    try {
      shortLivedTokenData = await exchangeInstagramCodeForToken(code, redirectUri);
    } catch (error) {
      console.error("[storeInstagramDirect] code exchange failed", {
        redirectUri,
        status: error?.response?.status,
        data: error?.response?.data
      });
      return res.status(502).json({
        error:
          "Falha ao trocar o código de autorização do Instagram. Verifique se a URL de redirecionamento cadastrada no app da Meta é exatamente a mesma usada pelo sistema."
      });
    }

    const shortLivedToken = shortLivedTokenData.access_token;
    let instagramAccessToken = shortLivedToken;
    let tokenMetaExpiresAt: Date | null = null;
    let instagramProfile: any = {};

    try {
      const longLived = await exchangeForLongLivedInstagramToken(shortLivedToken);
      instagramAccessToken = longLived.accessToken;
      if (longLived.expiresInSeconds > 0) {
        tokenMetaExpiresAt = new Date(Date.now() + longLived.expiresInSeconds * 1000);
      }
    } catch (error) {
      // Sem o long-lived a conexão expira em ~1h e o subscribe abaixo
      // tende a falhar. Logamos o erro completo da Meta para diagnóstico.
      console.error("[storeInstagramDirect] long-lived token exchange failed", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
    }

    try {
      instagramProfile = await getInstagramMe(instagramAccessToken);
    } catch (error) {
      // Não é fatal: o code exchange já devolve user_id Instagram-scoped,
      // que é o que precisamos para casar com o webhook. Seguimos sem o
      // perfil completo (nome/username) quando o /me falha.
      console.warn("[storeInstagramDirect] profile fetch failed; using code exchange user_id", {
        error: error?.response?.data?.error || error?.message
      });
    }

    // O webhook do Instagram envia entry.id = user_id (Instagram-scoped).
    // O campo "id" do /me é app-scoped e NÃO bate com o webhook — por isso
    // priorizamos sempre user_id e nunca caímos para o id app-scoped.
    const instagramUserId = String(
      instagramProfile.user_id || shortLivedTokenData.user_id || ""
    );

    if (!instagramUserId) {
      return res.status(400).json({
        error: "Não foi possível identificar a conta Instagram autorizada."
      });
    }

    try {
      await subscribeInstagramDirectApp(instagramUserId, instagramAccessToken);
    } catch (error) {
      console.error("[storeInstagramDirect] webhook subscription failed", {
        instagramUserId,
        error: error?.response?.data?.error || error?.message
      });
      return res.status(502).json({
        error:
          "A conta foi autorizada, mas não foi possível inscrever o webhook de mensagens na Meta. A conta não receberia mensagens. Tente novamente."
      });
    }

    const pageConection = {
      companyId,
      name: `Insta ${instagramProfile.username || instagramUserId}`,
      facebookUserId: instagramUserId,
      facebookPageUserId: instagramUserId,
      facebookUserToken: instagramAccessToken,
      tokenMeta: shortLivedToken,
      tokenMetaExpiresAt,
      provider: "instagram_direct",
      isDefault: false,
      channel: "instagram",
      status: "CONNECTED",
      greetingMessage: "",
      farewellMessage: "",
      queueIds: [],
      isMultidevice: false
    };

    let connection: Whatsapp;
    const exist = await Whatsapp.findOne({
      where: {
        facebookPageUserId: pageConection.facebookPageUserId,
        channel: "instagram",
        companyId
      }
    });

    if (exist) {
      await exist.update({
        facebookUserId: pageConection.facebookUserId,
        facebookUserToken: pageConection.facebookUserToken,
        tokenMeta: pageConection.tokenMeta,
        tokenMetaExpiresAt: pageConection.tokenMetaExpiresAt,
        provider: pageConection.provider,
        status: "CONNECTED",
        channel: pageConection.channel
      });
      connection = exist;
    } else {
      const created = await CreateWhatsAppService(pageConection);
      connection = created.whatsapp;
    }

    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
      action: "update",
      whatsapp: connection
    });

    return res.status(200).json({ ok: true, whatsapp: connection });
  } catch (error) {
    console.log(error);
    const metaError = error?.response?.data?.error;
    return res.status(400).json({
      error: metaError?.message || error?.message || "Erro ao conectar Instagram direto"
    });
  }
};

export const syncInstagramDms = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const whatsapp = await Whatsapp.findOne({
    where: {
      id: whatsappId,
      companyId,
      channel: "instagram"
    }
  });

  if (!whatsapp) {
    return res.status(404).json({
      error: "Instagram connection not found"
    });
  }

  const io = getIO();
  const getSafeMetaError = (error: any) => {
    const metaError = error?.response?.data?.error;

    return {
      message: metaError?.message || error?.message || "sync failed",
      type: metaError?.type,
      code: metaError?.code,
      subcode: metaError?.error_subcode,
      fbtrace_id: metaError?.fbtrace_id
    };
  };
  const emitStatus = (status: "started" | "done" | "error", payload: any = {}) => {
    io.of(String(companyId)).emit(`company-${companyId}-instagramSync`, {
      whatsappId: whatsapp.id,
      status,
      ...payload
    });
  };

  emitStatus("started");

  SyncInstagramDmsService({ instagramWhatsapp: whatsapp })
    .then(result => emitStatus("done", result))
    .catch(error => {
      const safeError = getSafeMetaError(error);
      console.error("[syncInstagramDms]", safeError);
      emitStatus("error", safeError);
    });

  return res.status(202).json({ accepted: true, whatsappId: whatsapp.id });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const { session } = req.query;

  // console.log("SHOWING WHATSAPP", whatsappId)
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, session);


  return res.status(200).json(whatsapp);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const { companyId } = req.user;

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId,
    companyId
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-whatsapp`, {
      action: "update",
      whatsapp
    });

  if (oldDefaultWhatsapp) {
    io.of(String(companyId))
      .emit(`company-${companyId}-whatsapp`, {
        action: "update",
        whatsapp: oldDefaultWhatsapp
      });
  }

  return res.status(200).json(whatsapp);

};

export const closedTickets = async (req: Request, res: Response) => {
  const { whatsappId } = req.params

  closeTicketsImported(whatsappId)

  return res.status(200).json("whatsapp");

}

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId, profile } = req.user;
  const io = getIO();

  if (profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  console.log("REMOVING WHATSAPP", whatsappId)
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);


  if (whatsapp.channel === "whatsapp") {
    await DeleteBaileysService(whatsappId);
    await DeleteWhatsAppService(whatsappId);
    await cacheLayer.delFromPattern(`sessions:${whatsappId}:*`);
    removeWbot(+whatsappId);

    io.of(String(companyId))
      .emit(`company-${companyId}-whatsapp`, {
        action: "delete",
        whatsappId: +whatsappId
      });

  }

  if (whatsapp.channel === "facebook" || whatsapp.channel === "instagram") {
    const { facebookUserToken } = whatsapp;

    const getAllSameToken = await Whatsapp.findAll({
      where: {
        facebookUserToken
      }
    });

    await Whatsapp.destroy({
      where: {
        facebookUserToken
      }
    });

    for await (const whatsapp of getAllSameToken) {
      io.of(String(companyId))
        .emit(`company-${companyId}-whatsapp`, {
          action: "delete",
          whatsappId: whatsapp.id
        });
    }

  }

  return res.status(200).json({ message: "Session disconnected." });
};

export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, profile, id } = req.user;

  const user = await User.findByPk(id);
  const { allowConnections } = user;

  if (profile !== "admin" && allowConnections === "disabled") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await restartWbot(companyId);

  return res.status(200).json({ message: "Whatsapp restart." });
};

export const listAll = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { session } = req.query as QueryParams;
  const whatsapps = await ListAllWhatsAppsService({ session });
  return res.status(200).json(whatsapps);
};

export const updateAdmin = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const { companyId } = req.user;

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppServiceAdmin({
    whatsappData,
    whatsappId,
    companyId
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`admin-whatsapp`, {
      action: "update",
      whatsapp
    });

  if (oldDefaultWhatsapp) {
    io.of(String(companyId))
      .emit(`admin-whatsapp`, {
        action: "update",
        whatsapp: oldDefaultWhatsapp
      });
  }

  return res.status(200).json(whatsapp);
};

export const removeAdmin = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const io = getIO();
  console.log("REMOVING WHATSAPP ADMIN", whatsappId)
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);


  if (whatsapp.channel === "whatsapp") {
    await DeleteBaileysService(whatsappId);
    await DeleteWhatsAppService(whatsappId);
    await cacheLayer.delFromPattern(`sessions:${whatsappId}:*`);
    removeWbot(+whatsappId);

    io.of(String(companyId))
      .emit(`admin-whatsapp`, {
        action: "delete",
        whatsappId: +whatsappId
      });

  }

  if (whatsapp.channel === "facebook" || whatsapp.channel === "instagram") {
    const { facebookUserToken } = whatsapp;

    const getAllSameToken = await Whatsapp.findAll({

      where: {
        facebookUserToken
      }
    });

    await Whatsapp.destroy({
      where: {
        facebookUserToken
      }
    });

    for await (const whatsapp of getAllSameToken) {
      io.of(String(companyId))
        .emit(`company-${companyId}-whatsapp`, {
          action: "delete",
          whatsappId: whatsapp.id
        });
    }

  }

  return res.status(200).json({ message: "Session disconnected." });
};

export const showAdmin = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  // console.log("SHOWING WHATSAPP ADMIN", whatsappId)
  const whatsapp = await ShowWhatsAppServiceAdmin(whatsappId);


  return res.status(200).json(whatsapp);
};
