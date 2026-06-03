import { col, fn, Op, where } from "sequelize";
import { sub } from "date-fns";

import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import { isNil } from "lodash";
import { getIO } from "../../libs/socket";
import logger from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import CompaniesSettings from "../../models/CompaniesSettings";
import CreateLogTicketService from "./CreateLogTicketService";
import AppError from "../../errors/AppError";
import UpdateTicketService from "./UpdateTicketService";
import ContactTag from "../../models/ContactTag";
import Tag from "../../models/Tag";

const ACTIVE_TICKET_STATUSES = ["open", "pending", "group", "nps", "lgpd"];
const ticketCreationLocks = new Map<string, Promise<void>>();

const normalizeRemoteJid = (value?: string | null): string => {
  return String(value || "").trim().toLowerCase();
};

const normalizeNumber = (value?: string | null): string => {
  return String(value || "").replace(/\D/g, "");
};

const getContactIdentityKey = (contact: Contact): string => {
  const remoteJid = normalizeRemoteJid((contact as any).remoteJid);
  const number = normalizeNumber((contact as any).number);
  return remoteJid || number || `contact:${contact.id}`;
};

const withTicketCreationLock = async <T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> => {
  const previous = ticketCreationLocks.get(key);
  if (previous) {
    await previous.catch(() => undefined);
  }

  let release: () => void = () => undefined;
  const current = new Promise<void>(resolve => {
    release = resolve;
  });
  ticketCreationLocks.set(key, current);

  try {
    return await fn();
  } finally {
    release();
    if (ticketCreationLocks.get(key) === current) {
      ticketCreationLocks.delete(key);
    }
  }
};

const buildContactIdentityWhere = (contact: Contact): any => {
  const or: any[] = [{ id: contact.id }];
  const remoteJid = normalizeRemoteJid((contact as any).remoteJid);
  const number = normalizeNumber((contact as any).number);

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
  whatsappId,
  companyId,
  includeRecentClosed = false
}: {
  contact: Contact;
  whatsappId: number;
  companyId: number;
  includeRecentClosed?: boolean;
}): Promise<Ticket | null> => {
  const statuses = includeRecentClosed
    ? [...ACTIVE_TICKET_STATUSES, "closed"]
    : ACTIVE_TICKET_STATUSES;

  return Ticket.findOne({
    where: {
      status: { [Op.or]: statuses },
      companyId,
      whatsappId
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
    order: [["id", "DESC"]]
  });
};

// interface Response {
//   ticket: Ticket;
//   // isCreated: boolean;
// }

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsapp: Whatsapp,
  unreadMessages: number,
  companyId: number,
  queueId: number = null,
  userId: number = null,
  groupContact?: Contact,
  channel?: string,
  isImported?: boolean,
  isForward?: boolean,
  settings?: any,
  isTransfered?: boolean,
  isCampaign: boolean = false
): Promise<Ticket> => {
  const identityContact = groupContact || contact;
  const lockKey = `${companyId}:${whatsapp.id}:${getContactIdentityKey(identityContact)}`;

  return withTicketCreationLock(lockKey, async () => {
  // try {
  // let isCreated = false;

  let openAsLGPD = false
  if (settings.enableLGPD) { //adicionar lgpdMessage

    openAsLGPD = !isCampaign &&
      !isTransfered &&
      settings.enableLGPD === "enabled" &&
      settings.lgpdMessage !== "" &&
      (settings.lgpdConsent === "enabled" ||
        (settings.lgpdConsent === "disabled" && isNil(contact?.lgpdAcceptedAt)))
  }

  const io = getIO();

  const DirectTicketsToWallets = settings.DirectTicketsToWallets;
  let createdTicket = false;

  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ACTIVE_TICKET_STATUSES
      },
      contactId: identityContact.id,
      companyId,
      whatsappId: whatsapp.id
    },
    order: [["id", "DESC"]]
  });

  if (!ticket) {
    ticket = await findActiveTicketByConversation({
      contact: identityContact,
      whatsappId: whatsapp.id,
      companyId
    });
    if (ticket && Number(ticket.contactId) !== Number(identityContact.id)) {
      logger.warn(
        `[Tickets] conversa ativa reaproveitada por identidade company=${companyId} whatsapp=${whatsapp.id} incomingContact=${identityContact.id} existingTicket=${ticket.id} existingContact=${ticket.contactId}`
      );
    }
  }


  if (ticket) {
    if (isCampaign) {
      await ticket.update({
        userId: userId !== ticket.userId ? ticket.userId : userId,
        queueId: queueId !== ticket.queueId ? ticket.queueId : queueId,
      })
    } else {
      await ticket.update({ unreadMessages, isBot: false });
    }

    ticket = await ShowTicketService(ticket.id, companyId);
    // console.log(ticket.id)

    if (!isCampaign && !isForward) {
      // @ts-ignore: Unreachable code error
      if ((Number(ticket?.userId) !== Number(userId) && userId !== 0 && userId !== "" && userId !== "0" && !isNil(userId) && !ticket.isGroup)
        // @ts-ignore: Unreachable code error 
        || (queueId !== 0 && Number(ticket?.queueId) !== Number(queueId) && queueId !== "" && queueId !== "0" && !isNil(queueId))) {
        throw new AppError(`Ticket em outro atendimento. ${"Atendente: " + ticket?.user?.name} - ${"Fila: " + ticket?.queue?.name}`);
      }
    }

    // isCreated = true;

    return ticket

  }

  const timeCreateNewTicket = whatsapp.timeCreateNewTicket;

  if (!ticket && timeCreateNewTicket !== 0) {

    // @ts-ignore: Unreachable code error
    if (timeCreateNewTicket !== 0 && timeCreateNewTicket !== "0") {
      ticket = await Ticket.findOne({
        where: {
          updatedAt: {
            [Op.between]: [
              +sub(new Date(), {
                minutes: Number(timeCreateNewTicket)
              }),
              +new Date()
            ]
          },
          contactId: identityContact.id,
          companyId,
          whatsappId: whatsapp.id
        },
        order: [["updatedAt", "DESC"]]
      });
    }

    if (ticket && ticket.status !== "nps") {
      await ticket.update({
        status: "pending",
        unreadMessages,
        companyId,
        // queueId: timeCreateNewTicket === 0 ? null : ticket.queueId
      });
    }
  }

  if (!ticket) {

    const ticketData: any = {
      contactId: groupContact ? groupContact.id : contact.id,
      status: (!isImported && !isNil(settings.enableLGPD)
        && openAsLGPD && !groupContact) ? //verifica se lgpd está habilitada e não é grupo e se tem a mensagem e link da política
        "lgpd" :  //abre como LGPD caso habilitado parâmetro
        (whatsapp.groupAsTicket === "enabled" || !groupContact) ? // se lgpd estiver desabilitado, verifica se é para tratar ticket como grupo ou se é contato normal
          "pending" : //caso  é para tratar grupo como ticket ou não é grupo, abre como pendente
          "group", // se não é para tratar grupo como ticket, vai direto para grupos
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId: whatsapp.id,
      companyId,
      isBot: groupContact ? false : true,
      channel,
      imported: isImported ? new Date() : null,
      isActiveDemand: false,
    };

    if (DirectTicketsToWallets && contact.id) {
      const wallet: any = contact;
      const wallets = await wallet.getWallets();
      if (wallets && wallets[0]?.id) {
        ticketData.status = (!isImported && !isNil(settings.enableLGPD)
          && openAsLGPD && !groupContact) ? //verifica se lgpd está habilitada e não é grupo e se tem a mensagem e link da política
          "lgpd" :  //abre como LGPD caso habilitado parâmetro
          (whatsapp.groupAsTicket === "enabled" || !groupContact) ? // se lgpd estiver desabilitado, verifica se é para tratar ticket como grupo ou se é contato normal
            "open" : //caso  é para tratar grupo como ticket ou não é grupo, abre como pendente
            "group", // se não é para tratar grupo como ticket, vai direto para grupos
          ticketData.userId = wallets[0].id;
      }
    }

    try {
      ticket = await Ticket.create(ticketData);
      createdTicket = true;
    } catch (err: any) {
      const errText = `${err?.message || ""} ${err?.original?.message || ""}`;
      if (!errText.includes("ERR_DUPLICATED_ACTIVE_TICKET")) {
        throw err;
      }

      logger.warn(
        `[Tickets] tentativa duplicada bloqueada pelo banco company=${companyId} whatsapp=${whatsapp.id} contact=${identityContact.id}. Reaproveitando ticket ativo.`
      );
      ticket = await findActiveTicketByConversation({
        contact: identityContact,
        whatsappId: whatsapp.id,
        companyId
      });
      if (!ticket) {
        throw err;
      }
    }

    // await FindOrCreateATicketTrakingService({
    //   ticketId: ticket.id,
    //   companyId,
    //   whatsappId: whatsapp.id,
    //   userId: userId ? userId : ticket.userId
    // });
  }


  if (queueId != 0 && !isNil(queueId)) {
    //Determina qual a fila esse ticket pertence.
    await ticket.update({ queueId: queueId });
  }

  if (userId != 0 && !isNil(userId)) {
    //Determina qual a fila esse ticket pertence.
    await ticket.update({ userId: userId });
  }

  if (createdTicket && !groupContact) {
    const inboxTagsToClear = await Tag.findAll({
      where: { companyId, kanban: { [Op.in]: [0, 2] } },
      attributes: ["id"]
    });
    const inboxTagIdsToClear = inboxTagsToClear.map(tag => tag.id);
    if (inboxTagIdsToClear.length > 0) {
      await ContactTag.destroy({
        where: {
          contactId: contact.id,
          tagId: { [Op.in]: inboxTagIdsToClear }
        }
      });
    }
  }

  ticket = await ShowTicketService(ticket.id, companyId);

  await CreateLogTicketService({
    ticketId: ticket.id,
    type: openAsLGPD ? "lgpd" : "create"
  });


  return ticket;
  });
};

export default FindOrCreateTicketService;
