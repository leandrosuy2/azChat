import AppError from "../../errors/AppError";
import { col, fn, Op, where } from "sequelize";

import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import GetDefaultWhatsAppByUser from "../../helpers/GetDefaultWhatsAppByUser";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
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

const buildContactIdentityWhere = (contact: Contact): any => {
  const remoteJid = String((contact as any).remoteJid || "")
    .trim()
    .toLowerCase();
  const number = String((contact as any).number || "").replace(/\D/g, "");
  const or: any[] = [{ id: contact.id }];

  if (remoteJid) {
    or.push({ remoteJid: { [Op.iLike]: remoteJid } });
  }

  if (number) {
    or.push(
      where(
        fn("REGEXP_REPLACE", col("contact.number"), "\\D", "", "g"),
        number
      )
    );
  }

  return { [Op.or]: or };
};

const findActiveTicketByConversation = async ({
  contact,
  companyId,
  channel
}: {
  contact: Contact;
  companyId: number;
  channel: string;
}): Promise<Ticket | null> => {
  return Ticket.findOne({
    where: {
      companyId,
      channel,
      status: { [Op.in]: ["open", "pending", "group", "nps", "lgpd"] }
    },
    include: [
      {
        model: Contact,
        as: "contact",
        required: true,
        where: {
          companyId,
          ...buildContactIdentityWhere(contact)
        }
      }
    ],
    order: [["updatedAt", "DESC"], ["id", "DESC"]]
  });
};

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

  const contact = await ShowContactService(contactId, companyId);
  const { isGroup } = contact;

  if (!forceNewTicket) {
    const activeTicket = await findActiveTicketByConversation({
      contact,
      companyId,
      channel: defaultWhatsapp.channel
    });

    if (activeTicket) {
      return ShowTicketService(activeTicket.id, companyId);
    }
  }

  let ticket: Ticket;
  try {
    ticket = await Ticket.create({
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
  } catch (err: any) {
    const errText = `${err?.message || ""} ${err?.original?.message || ""}`;
    if (!errText.includes("ERR_DUPLICATED_ACTIVE_TICKET")) {
      throw err;
    }

    const activeTicket = await findActiveTicketByConversation({
      contact,
      companyId,
      channel: defaultWhatsapp.channel
    });
    if (!activeTicket) {
      throw err;
    }
    return ShowTicketService(activeTicket.id, companyId);
  }

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
