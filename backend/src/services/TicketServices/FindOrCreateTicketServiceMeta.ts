import { subHours } from "date-fns";
import { col, fn, Op, where } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import Setting from "../../models/Setting";

interface TicketData {
  status?: string;
  companyId?: number;
  unreadMessages?: number;
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

const FindOrCreateTicketServiceMeta = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  companyId: number,
  channel: string
): Promise<Ticket> => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending", "closed"]
      },
      companyId,
      channel
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

  if (ticket) {
    await ticket.update({ unreadMessages });
  }

  if (!ticket) {
    ticket = await Ticket.findOne({
      where: {
        companyId,
        channel
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
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        companyId,
        channel
      });
      await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        whatsappId: ticket.whatsappId,
        userId: ticket.userId
      });
    }
    const msgIsGroupBlock = await Setting.findOne({
      where: { key: "timeCreateNewTicket" }
    });

    const value = msgIsGroupBlock ? parseInt(msgIsGroupBlock.value, 10) : 7200;
  }

  if (!ticket) {
    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+subHours(new Date(), 2), +new Date()]
        },
        companyId,
        channel
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
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        companyId,
        channel
      });
      await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        whatsappId: ticket.whatsappId,
        userId: ticket.userId
      });
    }
  }

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: contact.id,
      status: "pending",
      isGroup: false,
      unreadMessages,
      whatsappId,
      companyId,
      channel,
      isActiveDemand: false
    });

    await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      companyId,
      whatsappId,
      userId: ticket.userId
    });

  } else {
    await ticket.update({ whatsappId });
  }

  ticket = await ShowTicketService(ticket.id, companyId);

  return ticket;
};

export default FindOrCreateTicketServiceMeta;
