import * as Yup from "yup";
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import Ticket from "../models/Ticket";
import User from "../models/User";
import TicketBudgetOrder from "../models/TicketBudgetOrder";
import CreateTicketBudgetService from "../services/BudgetServices/CreateTicketBudgetService";
import ListTicketBudgetsService from "../services/BudgetServices/ListTicketBudgetsService";
import ListContactBudgetsService from "../services/BudgetServices/ListContactBudgetsService";
import Contact from "../models/Contact";
import ShowTicketBudgetService from "../services/BudgetServices/ShowTicketBudgetService";
import UpdateTicketBudgetService from "../services/BudgetServices/UpdateTicketBudgetService";
import SendBudgetLinkWhatsAppService from "../services/BudgetServices/SendBudgetLinkWhatsAppService";
import SendBudgetPdfWhatsAppService from "../services/BudgetServices/SendBudgetPdfWhatsAppService";
import SendOrderPdfWhatsAppService from "../services/BudgetServices/SendOrderPdfWhatsAppService";
import ApproveTicketBudgetService from "../services/BudgetServices/ApproveTicketBudgetService";
import RejectTicketBudgetService from "../services/BudgetServices/RejectTicketBudgetService";
import { BudgetPayloadStored } from "../models/TicketBudget";

const payloadSchema = Yup.object().shape({
  company: Yup.object()
    .shape({
      name: Yup.string(),
      phone: Yup.string(),
      email: Yup.string(),
      document: Yup.string(),
      logoUrl: Yup.string().nullable()
    })
    .required(),
  client: Yup.object()
    .shape({
      name: Yup.string(),
      doc: Yup.string(),
      address: Yup.string(),
      city: Yup.string(),
      state: Yup.string(),
      zip: Yup.string(),
      email: Yup.string(),
      phone: Yup.string()
    })
    .required(),
  sellerName: Yup.string(),
  notes: Yup.string().nullable(),
  items: Yup.array()
    .of(
      Yup.object().shape({
        code: Yup.string(),
        description: Yup.string(),
        qty: Yup.number(),
        unitPrice: Yup.number(),
        total: Yup.number().nullable()
      })
    )
    .min(1),
  automation: Yup.object()
    .shape({ kanbanTagId: Yup.number().nullable() })
    .nullable()
});

export const listByTicket = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const ticketId = parseInt(req.params.ticketId, 10);
  if (Number.isNaN(ticketId)) {
    return res.status(400).json({ error: "ticketId inválido" });
  }
  const ticket = await Ticket.findOne({ where: { id: ticketId, companyId } });
  if (!ticket) {
    return res.status(404).json({ error: "Ticket não encontrado" });
  }
  const rows = await ListTicketBudgetsService(ticketId, companyId);
  return res.json(rows);
};

export const listByContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const contactId = parseInt(req.params.contactId, 10);
  if (Number.isNaN(contactId)) {
    return res.status(400).json({ error: "contactId inválido" });
  }
  const contact = await Contact.findOne({ where: { id: contactId, companyId } });
  if (!contact) {
    return res.status(404).json({ error: "Contato não encontrado" });
  }
  const rows = await ListContactBudgetsService(contactId, companyId);
  return res.json(rows);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id inválido" });
  }
  const row = await ShowTicketBudgetService(id, companyId);
  const order = await TicketBudgetOrder.findOne({
    where: { budgetId: id, companyId }
  });
  const plain = row.get({ plain: true }) as Record<string, unknown>;
  return res.json({
    ...plain,
    order: order ? order.get({ plain: true }) : null
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number((req.user as { id: number | string }).id);
  const { ticketId, contactId, validUntil, payload } = req.body as {
    ticketId?: number | null;
    contactId?: number | null;
    validUntil?: string | null;
    payload: BudgetPayloadStored;
  };

  try {
    await payloadSchema.validate(payload);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  if (ticketId != null) {
    const ticket = await Ticket.findOne({
      where: { id: Number(ticketId), companyId }
    });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket não encontrado" });
    }
  }

  const row = await CreateTicketBudgetService({
    companyId,
    userId,
    ticketId: ticketId != null ? Number(ticketId) : null,
    contactId: contactId != null ? Number(contactId) : null,
    validUntil: validUntil || null,
    payload
  });

  return res.status(201).json(row);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id inválido" });
  }
  const { validUntil, payload } = req.body as {
    validUntil?: string | null;
    payload: BudgetPayloadStored;
  };

  try {
    await payloadSchema.validate(payload);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const row = await UpdateTicketBudgetService({
    id,
    companyId,
    validUntil,
    payload
  });

  return res.json(row);
};

export const sendLinkWhatsApp = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id inválido" });
  }
  const row = await ShowTicketBudgetService(id, companyId);
  if (!row.ticketId) {
    throw new AppError("ERR_BUDGET_NO_TICKET_FOR_WHATSAPP", 400);
  }
  const ticket = await Ticket.findOne({
    where: { id: row.ticketId, companyId }
  });
  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }
  const frontendBaseUrl = process.env.FRONTEND_URL || "";
  await SendBudgetLinkWhatsAppService({
    budget: row,
    ticket,
    frontendBaseUrl
  });
  return res.json({ ok: true });
};

export const sendPdfWhatsApp = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id inválido" });
  }
  const row = await ShowTicketBudgetService(id, companyId);
  if (!row.ticketId) {
    throw new AppError("Orçamento sem ticket — não é possível enviar pelo WhatsApp.", 400);
  }
  const ticket = await Ticket.findOne({
    where: { id: row.ticketId, companyId }
  });
  if (!ticket) {
    throw new AppError("Ticket não encontrado.", 404);
  }
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    throw new AppError("Envie o PDF no campo pdf.", 400);
  }
  await SendBudgetPdfWhatsAppService({
    budget: row,
    ticket,
    file
  });
  return res.json({ ok: true });
};

export const sendOrderPdfWhatsApp = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id inválido" });
  }
  const row = await ShowTicketBudgetService(id, companyId);
  if (!row.ticketId) {
    throw new AppError("Orçamento sem ticket — não é possível enviar pelo WhatsApp.", 400);
  }
  const order = await TicketBudgetOrder.findOne({
    where: { budgetId: id, companyId }
  });
  if (!order) {
    throw new AppError(
      "Não há ordem de serviço para este orçamento. Aprove o orçamento antes.",
      400
    );
  }
  const ticket = await Ticket.findOne({
    where: { id: row.ticketId, companyId }
  });
  if (!ticket) {
    throw new AppError("Ticket não encontrado.", 404);
  }
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    throw new AppError("Envie o PDF no campo pdf.", 400);
  }
  await SendOrderPdfWhatsAppService({
    budget: row,
    order,
    ticket,
    file
  });
  return res.json({ ok: true });
};

/** Aprovação pelo atendente no painel: gera OS (TicketBudgetOrder) sem exigir assinatura do cliente. */
export const approveAgent = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number((req.user as { id: number | string }).id);
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id inválido" });
  }
  const budget = await ShowTicketBudgetService(id, companyId);
  const userRow = await User.findByPk(userId, { attributes: ["name"] });
  const signerName =
    userRow?.name?.trim() ||
    `Aprovado pelo atendente (usuário #${userId})`;

  const result = await ApproveTicketBudgetService({
    budget,
    signerName,
    signatureImage: null,
    signerIp: null,
    notifyClient: false
  });

  return res.json({
    ok: true,
    budget: result.budget.get({ plain: true }),
    order: result.order.get({ plain: true })
  });
};

export const rejectAgent = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id inválido" });
  }

  const schema = Yup.object().shape({
    reason: Yup.string().trim().max(2000).nullable()
  });
  try {
    await schema.validate(req.body || {});
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { reason } = (req.body || {}) as { reason?: string | null };
  const budget = await ShowTicketBudgetService(id, companyId);
  const updated = await RejectTicketBudgetService(budget, reason);

  return res.json({
    ok: true,
    budget: updated.get({ plain: true })
  });
};
