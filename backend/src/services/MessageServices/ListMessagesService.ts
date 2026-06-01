import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import TicketQuadro from "../../models/TicketQuadro";
import { Op } from "sequelize";
import { intersection } from "lodash";
import User from "../../models/User";
import isQueueIdHistoryBlocked from "../UserServices/isQueueIdHistoryBlocked";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";

interface Request {
  ticketId: string;
  companyId: number;
  pageNumber?: string;
  queues?: number[];
  user?: User;
}

interface Response {
  messages: Message[];
  ticket: Ticket | Record<string, unknown>;
  count: number;
  hasMore: boolean;
}

/** Quadro livre: não há mensagens no banco; o front usa o mesmo UUID do cartão na URL /messages/:uuid */
function buildStandaloneMessagesTicket(quadro: TicketQuadro, companyId: number): Record<string, unknown> {
  const lc = (quadro as any).linkedContact as Contact | undefined;
  return {
    id: -Math.abs(quadro.id),
    uuid: quadro.uuid,
    status: "open",
    channel: "standalone",
    companyId,
    contactId: lc?.id ?? 0,
    whatsappId: null,
    queueId: null,
    isGroup: false,
    contact: lc
      ? { id: lc.id, name: lc.name, number: lc.number }
      : { id: 0, name: "Quadro livre", number: "" }
  };
}

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId,
  companyId,
  queues = [],
  user
}: Request): Promise<Response> => {
  let resolvedId = String(ticketId || "").trim();

  if (resolvedId !== "" && !Number.isNaN(Number(resolvedId)) && /^\d+$/.test(resolvedId)) {
    const row = await Ticket.findOne({
      where: { id: resolvedId, companyId },
      attributes: ["uuid"]
    });
    if (!row?.uuid) {
      throw new AppError("ERR_NO_TICKET_FOUND", 404);
    }
    resolvedId = row.uuid;
  }

  let ticket = await Ticket.findOne({
    where: {
      uuid: resolvedId,
      companyId
    }
  });

  if (!ticket) {
    const quadro = await TicketQuadro.findOne({
      where: { uuid: resolvedId, companyId },
      include: [{ model: Contact, as: "linkedContact", attributes: ["id", "name", "number"] }]
    });

    if (quadro?.ticketId) {
      ticket = await Ticket.findOne({
        where: { id: quadro.ticketId, companyId }
      });
    }

    if (!ticket && quadro && !quadro.ticketId) {
      return {
        count: 0,
        messages: [],
        ticket: buildStandaloneMessagesTicket(quadro, companyId),
        hasMore: false
      };
    }
  }

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const ticketsFilter: number[][] = [];

  const isAllHistoricEnabled = await isQueueIdHistoryBlocked({ userRequest: user.id });

  let ticketIds: Ticket[] = [];
  if (!isAllHistoricEnabled) {
    const adminLike =
      user.profile === "admin" ||
      user.allTicket === "enable" ||
      (ticket.isGroup && user.allowGroup);

    const baseWhere: any = {
      id: { [Op.lte]: ticket.id },
      companyId: ticket.companyId,
      contactId: ticket.contactId,
      whatsappId: ticket.whatsappId,
      isGroup: ticket.isGroup
    };

    if (adminLike) {
      if (queues && queues.length > 0) {
        baseWhere.queueId = { [Op.or]: [queues, null] };
      }
    } else {
      baseWhere.queueId = { [Op.in]: queues };
    }

    ticketIds = await Ticket.findAll({
      where: baseWhere,
      attributes: ["id"]
    });
  } else {
    ticketIds = await Ticket.findAll({
      where: {
        id: { [Op.lte]: ticket.id },
        companyId: ticket.companyId,
        contactId: ticket.contactId,
        whatsappId: ticket.whatsappId,
        isGroup: ticket.isGroup
      },
      attributes: ["id"]
    });
  }

  const ticketIdNumbers = ticketIds.map((t) => t.id);
  if (Number((ticket as any).userId) === Number(user.id) && !ticketIdNumbers.includes(ticket.id)) {
    ticketIdNumbers.push(ticket.id);
  }

  ticketsFilter.push(ticketIdNumbers);

  const tickets: number[] = intersection(...ticketsFilter);

  if (!tickets || tickets.length === 0) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: messages } = await Message.findAndCountAll({
    where: { ticketId: tickets, companyId },
    attributes: [
      "id",
      "fromMe",
      "mediaUrl",
      "body",
      "mediaType",
      "ack",
      "createdAt",
      "ticketId",
      "isDeleted",
      "queueId",
      "isForwarded",
      "isEdited",
      "isPrivate",
      "companyId"
    ],
    limit,
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name"]
      },
      {
        model: Message,
        attributes: ["id", "fromMe", "mediaUrl", "body", "mediaType", "companyId"],
        as: "quotedMsg",
        include: [
          {
            model: Contact,
            as: "contact",
            attributes: ["id", "name"]
          }
        ],
        required: false
      },
      {
        model: Ticket,
        required: true,
        attributes: ["id", "whatsappId", "queueId"],
        include: [
          {
            model: Queue,
            as: "queue",
            attributes: ["id", "name", "color"]
          }
        ]
      }
    ],
    distinct: true,
    offset,
    subQuery: false,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + messages.length;

  return {
    messages: messages.reverse(),
    ticket,
    count,
    hasMore
  };
};

export default ListMessagesService;
