import * as Yup from "yup";
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import Contact from "../models/Contact";
import CreateStandaloneOrderService from "../services/BudgetServices/CreateStandaloneOrderService";
import ListContactOrdersService from "../services/BudgetServices/ListContactOrdersService";

const orderItemsSchema = Yup.array()
  .of(
    Yup.object().shape({
      code: Yup.string(),
      description: Yup.string(),
      qty: Yup.number(),
      unitPrice: Yup.number(),
      total: Yup.number().nullable()
    })
  )
  .min(1);

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
  const rows = await ListContactOrdersService(contactId, companyId);
  return res.json(rows);
};

export const storeStandalone = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { ticketId, contactId, items } = req.body as {
    ticketId?: number | null;
    contactId?: number | null;
    items: unknown[];
  };

  try {
    await orderItemsSchema.validate(items);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const order = await CreateStandaloneOrderService({
    companyId,
    ticketId: ticketId != null ? Number(ticketId) : null,
    contactId: contactId != null ? Number(contactId) : null,
    items: items as Parameters<typeof CreateStandaloneOrderService>[0]["items"]
  });

  return res.status(201).json(order);
};
