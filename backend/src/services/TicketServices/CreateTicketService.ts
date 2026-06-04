import AppError from "../../errors/AppError";
import { Op } from "sequelize";

import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import GetDefaultWhatsAppByUser from "../../helpers/GetDefaultWhatsAppByUser";
import Ticket from "../../models/Ticket";
import ShowContactService from "../ContactServices/ShowContactService";
import { getIO } from "../../libs/socket";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import QuadroGroup from "../../models/QuadroGroup";
import { ensureQuadroRowForTicket } from "../../helpers/ResolveQuadroFromPublicParam";

import CreateLogTicketService from "./CreateLogTicketService";
import ShowTicketService from "./ShowTicketService";
import ShowUserService from "../UserServices/ShowUserService";

interface Request {
  contactId: number;
  status: string;
  userId: number;
  companyId: number;
  queueId?: number;
  whatsappId: string;
  /** Quando true, força criar um novo ticket sem reaproveitar aberto do mesmo contato. */
  forceNewTicket?: boolean;
  /** Área de trabalho Kanban (opcional; body HTTP pode vir como string) */
  quadroGroupId?: number | null | string;
  /** Título do cartão no quadro (TicketQuadro.nomeProjeto) */
  nomeProjeto?: string | null;
}

const CreateTicketService = async ({
  contactId,
  status,
  userId,
  queueId,
  companyId,
  whatsappId = "",
  forceNewTicket = true,
  quadroGroupId,
  nomeProjeto
}: Request): Promise<Ticket> => {

  const io = getIO();

  let whatsapp;
  let defaultWhatsapp

  if (whatsappId !== "undefined" && whatsappId !== null && whatsappId !== "") {
    // console.log("GETTING WHATSAPP CREATE TICKETSERVICE", whatsappId)
    whatsapp = await ShowWhatsAppService(whatsappId, companyId)
  }


  defaultWhatsapp = await GetDefaultWhatsAppByUser(userId);

  if (whatsapp) {
    defaultWhatsapp = whatsapp;
  }
  if (!defaultWhatsapp) {
    defaultWhatsapp = await GetDefaultWhatsApp(
      whatsapp != null ? whatsapp.id : undefined,
      companyId,
      userId
    );
  }

  const qgRaw = quadroGroupId;
  const qgNum =
    qgRaw == null || qgRaw === ""
      ? NaN
      : Number(qgRaw);
  const qg =
    !Number.isNaN(qgNum) && qgNum > 0 ? qgNum : null;

  if (qg != null) {
    const groupOk = await QuadroGroup.findOne({
      where: { id: qg, companyId }
    });
    if (!groupOk) {
      throw new AppError("Área de trabalho (Kanban) inválida.", 400);
    }
  }

  let resolvedQueueId: number | null =
    queueId === null ||
    queueId === undefined ||
    (typeof queueId === "string" && String(queueId).trim() === "") ||
    (typeof queueId === "number" && Number.isNaN(queueId))
      ? null
      : Number(queueId);

  if (
    qg != null &&
    (resolvedQueueId == null || Number.isNaN(Number(resolvedQueueId)))
  ) {
    const u = await ShowUserService(userId, companyId);
    const firstQ = u.queues && u.queues.length > 0 ? u.queues[0] : null;
    if (firstQ) {
      resolvedQueueId = Number(firstQ.id);
    }
  }

  // Regra do CRM: criação manual deve sempre permitir novo atendimento,
  // mesmo para o mesmo contato/número.
  // Se no futuro precisarem bloquear/reaproveitar, isso deve ser opt-in explícito por tela.

  const { isGroup } = await ShowContactService(contactId, companyId);

  if (!forceNewTicket) {
    const activeTicket = await Ticket.findOne({
      where: {
        contactId,
        companyId,
        whatsappId: defaultWhatsapp.id,
        status: { [Op.in]: ["open", "pending", "group"] }
      },
      order: [["updatedAt", "DESC"]]
    });

    if (activeTicket) {
      return ShowTicketService(activeTicket.id, companyId);
    }
  }

  let ticket = await Ticket.create({
    contactId,
    companyId,
    whatsappId: defaultWhatsapp.id,
    channel: defaultWhatsapp.channel,
    isGroup,
    userId,
    isBot: true,
    queueId: resolvedQueueId,
    status: isGroup ? "group" : "open",
    isActiveDemand: true,
    ...(qg != null ? { quadroGroupId: qg } : {})
  });

  const nomeProjetoTrim =
    typeof nomeProjeto === "string" && nomeProjeto.trim() !== ""
      ? nomeProjeto.trim()
      : null;

  if (
    !isGroup &&
    (nomeProjetoTrim != null || qg != null)
  ) {
    const quadro = await ensureQuadroRowForTicket(ticket.id, companyId);
    await quadro.update({
      ...(nomeProjetoTrim ? { nomeProjeto: nomeProjetoTrim } : {}),
      ...(qg != null ? { quadroGroupId: qg } : {})
    });
  }

  // await Ticket.update(
  //   { companyId, queueId, userId, status: isGroup? "group": "open", isBot: true },
  //   { where: { id } }
  // );

  ticket = await ShowTicketService(ticket.id, companyId);

  if (!ticket) {
    throw new AppError("ERR_CREATING_TICKET");
  }

  io.of(String(companyId))
    // .to(ticket.status)
    // .to("notification")
    // .to(ticket.id.toString())
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });

  await CreateLogTicketService({
    userId,
    queueId: resolvedQueueId,
    ticketId: ticket.id,
    type: "create"
  });

  return ticket;
};

export default CreateTicketService;
