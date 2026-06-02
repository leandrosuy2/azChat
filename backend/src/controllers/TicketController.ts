import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import Ticket from "../models/Ticket";

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketUUIDService from "../services/TicketServices/ShowTicketFromUUIDService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import UpdateTicketContactService from "../services/TicketServices/UpdateTicketContactService";
import ListTicketsServiceKanban from "../services/TicketServices/ListTicketsServiceKanban";
import QuadroGroup from "../models/QuadroGroup";

import CreateLogTicketService from "../services/TicketServices/CreateLogTicketService";
import ShowLogTicketService from "../services/TicketServices/ShowLogTicketService";
import FindOrCreateATicketTrakingService from "../services/TicketServices/FindOrCreateATicketTrakingService";
import ListTicketsServiceReport from "../services/TicketServices/ListTicketsServiceReport";
import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { assertKanbanPermission } from "../helpers/checkKanbanPermission";
import { Mutex } from "async-mutex";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date?: string;
  dateStart?: string;
  dateEnd?: string;
  updatedAt?: string;
  showAll: string;
  withUnreadMessages?: string;
  queueIds?: string;
  tags?: string;
  users?: string;
  whatsapps: string;
  statusFilter: string;
  isGroup?: string;
  sortTickets?: string;
  searchOnMessages?: string;
};

type IndexQueryReport = {
  searchParam: string;
  contactId: string;
  whatsappId: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  queueIds: string;
  tags: string;
  users: string;
  page: string;
  pageSize: string;
  onlyRated: string;
};


interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
  sendFarewellMessage?: boolean;
  whatsappId?: string;
  forceNewTicket?: boolean;
  /** Body JSON pode enviar número ou string */
  quadroGroupId?: number | null | string;
  /** Título do cartão / quadro (Kanban) — grava em TicketQuadro.nomeProjeto */
  nomeProjeto?: string | null;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    dateStart,
    dateEnd,
    updatedAt,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    withUnreadMessages,
    whatsapps: whatsappIdsStringified,
    statusFilter: statusStringfied,
    sortTickets,
    searchOnMessages,
    unreadOnly,
    groupsOnly
  } = req.query as IndexQuery & { unreadOnly?: string; groupsOnly?: string };

  const userId = Number(req.user.id);
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];
  let whatsappIds: number[] = [];
  let statusFilters: string[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  if (whatsappIdsStringified) {
    whatsappIds = JSON.parse(whatsappIdsStringified);
  }

  if (statusStringfied) {
    statusFilters = JSON.parse(statusStringfied);
  }

  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    tags: tagsIds,
    users: usersIds,
    pageNumber,
    status,
    date,
    dateStart,
    dateEnd,
    updatedAt,
    showAll,
    userId,
    queueIds,
    withUnreadMessages,
    whatsappIds,
    statusFilters,
    companyId,
    sortTickets,
    searchOnMessages,
    unreadOnly,
    groupsOnly
  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const report = async (req: Request, res: Response): Promise<Response> => {
  const {
    searchParam,
    contactId,
    whatsappId: whatsappIdsStringified,
    dateFrom,
    dateTo,
    status: statusStringified,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    page: pageNumber,
    pageSize,
    onlyRated
  } = req.query as IndexQueryReport;


  const userId = req.user.id;
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let whatsappIds: string[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];
  let statusIds: string[] = [];


  if (statusStringified) {
    statusIds = JSON.parse(statusStringified);
  }

  if (whatsappIdsStringified) {
    whatsappIds = JSON.parse(whatsappIdsStringified);
  }

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  const { tickets, totalTickets } = await ListTicketsServiceReport(
    companyId,
    {
      searchParam,
      queueIds,
      tags: tagsIds,
      users: usersIds,
      status: statusIds,
      dateFrom,
      dateTo,
      userId,
      contactId,
      whatsappId: whatsappIds,
      onlyRated: onlyRated
    },
    +pageNumber,

    +pageSize
  );

  return res.status(200).json({ tickets, totalTickets });
};

export const kanban = async (req: Request, res: Response): Promise<Response> => {
  assertKanbanPermission(req.user, "view");
  const {
    pageNumber,
    status,
    date,
    dateStart,
    dateEnd,
    updatedAt,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    withUnreadMessages,
    quadroGroupId,
    contactId
  } = req.query as IndexQuery & { quadroGroupId?: string; contactId?: string };

  const userId = req.user.id;
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsServiceKanban({
    searchParam,
    tags: tagsIds,
    users: usersIds,
    pageNumber,
    status,
    date,
    dateStart,
    dateEnd,
    updatedAt,
    showAll,
    userId,
    queueIds,
    withUnreadMessages,
    companyId,
    quadroGroupId,
    contactId
  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    contactId,
    status,
    userId,
    queueId,
    whatsappId,
    forceNewTicket,
    quadroGroupId,
    nomeProjeto
  }: TicketData = req.body;
  const { companyId } = req.user;

  const ticket = await CreateTicketService({
    contactId,
    status,
    userId,
    companyId,
    queueId,
    whatsappId,
    forceNewTicket,
    quadroGroupId,
    nomeProjeto
  });

  const io = getIO();
  io.of(String(companyId))
    // .to(ticket.status)
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });

  return res.status(200).json(ticket);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { id: userId, companyId } = req.user;

  const contact = await ShowTicketService(ticketId, companyId);

  await CreateLogTicketService({
    userId,
    ticketId,
    type: "access"
  });

  return res.status(200).json(contact);
};

export const showLog = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { id: userId, companyId } = req.user;

  const log = await ShowLogTicketService({ ticketId, companyId });

  return res.status(200).json(log);
};

export const showFromUUID = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { uuid } = req.params;
  const { id: userId, companyId } = req.user;


  const ticket = (await ShowTicketUUIDService(uuid, companyId)) as any;

  const ticketIdNum = Number(ticket?.id);
  const isStandalonePayload = ticket?.isStandaloneQuadro === true || ticket?.channel === "standalone";

  if (
    !isStandalonePayload &&
    ticket?.channel === "whatsapp" &&
    ticket?.whatsappId &&
    ticket?.unreadMessages > 0
  ) {
    SetTicketMessagesAsRead(ticket);
  }
  if (ticketIdNum > 0) {
    await CreateLogTicketService({
      userId,
      ticketId: ticket.id,
      type: "access"
    });
  }

  return res.status(200).json(ticket);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const ticketData: TicketData = req.body;
  const { companyId } = req.user;

  const mutex = new Mutex();
  const { ticket } = await mutex.runExclusive(async () => {
    const result = await UpdateTicketService({
      ticketData,
      ticketId,
      companyId
    });
    return result;
  });

  return res.status(200).json(ticket);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { id: userId, companyId } = req.user;

  // await ShowTicketService(ticketId, companyId);

  const ticket = await DeleteTicketService(ticketId, userId, companyId);

  const io = getIO();

  io.of(String(companyId))
    // .to(ticket.status)
    // .to(ticketId)
    // .to("notification")
    .emit(`company-${companyId}-ticket`, {
      action: "delete",
      ticketId: +ticketId
    });

  return res.status(200).json({ message: "ticket deleted" });
};

export const updateContact = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId, id: userId } = req.user;
  const { contactId } = req.body;
  const contactIdNum = contactId != null ? parseInt(String(contactId), 10) : NaN;
  if (!contactIdNum || Number.isNaN(contactIdNum)) {
    return res.status(400).json({ error: "contactId é obrigatório e deve ser um número" });
  }
  const ticket = await UpdateTicketContactService(ticketId, companyId, contactIdNum);
  return res.status(200).json(ticket);
};

export const closeAll = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { status }: TicketData = req.body;
  const io = getIO();

  const { rows: tickets } = await Ticket.findAndCountAll({
    where: { companyId: companyId, status: status },
    order: [["updatedAt", "DESC"]]
  });

  tickets.forEach(async ticket => {

    const ticketData = {
      status: "closed",
      userId: ticket.userId || null,
      queueId: ticket.queueId || null,
      unreadMessages: 0,
      amountUsedBotQueues: 0,
      sendFarewellMessage: false
    };

    await UpdateTicketService({ ticketData, ticketId: ticket.id, companyId })

  });

  return res.status(200).json();
};

/** Persiste ordem dos cards por coluna no Kanban (inclui ids negativos de cartões standalone). */
export const kanbanCardsReorder = async (
  req: Request,
  res: Response
): Promise<Response> => {
  assertKanbanPermission(req.user, "moveCard");
  const { companyId } = req.user;
  const { quadroGroupId, orderByLane } = req.body as {
    quadroGroupId?: string | number;
    orderByLane?: Record<string, string[]>;
  };
  const gid =
    quadroGroupId != null && quadroGroupId !== ""
      ? Number(quadroGroupId)
      : NaN;
  if (Number.isNaN(gid)) {
    return res.status(400).json({ error: "quadroGroupId inválido" });
  }
  if (!orderByLane || typeof orderByLane !== "object" || Array.isArray(orderByLane)) {
    return res.status(400).json({ error: "orderByLane deve ser um objeto" });
  }
  const group = await QuadroGroup.findOne({ where: { id: gid, companyId } });
  if (!group) {
    return res.status(404).json({ error: "Área de trabalho não encontrada" });
  }
  await group.update({
    kanbanCardsOrderJson: JSON.stringify(orderByLane)
  });
  return res.status(200).json({ ok: true });
};
