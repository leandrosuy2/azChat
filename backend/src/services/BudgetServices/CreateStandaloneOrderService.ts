import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import TicketBudgetOrder from "../../models/TicketBudgetOrder";

export type OrderItemInput = {
  code?: string;
  description?: string;
  qty?: number;
  unitPrice?: number;
  total?: number;
};

interface Request {
  companyId: number;
  ticketId?: number | null;
  contactId?: number | null;
  items: OrderItemInput[];
}

const sumItems = (items: OrderItemInput[]): number =>
  items.reduce((acc, it) => {
    const line =
      it.total != null && it.total !== ""
        ? Number(it.total)
        : Number(it.qty || 0) * Number(it.unitPrice || 0);
    return acc + (Number.isFinite(line) ? line : 0);
  }, 0);

const CreateStandaloneOrderService = async ({
  companyId,
  ticketId,
  contactId,
  items
}: Request): Promise<TicketBudgetOrder> => {
  if (!items?.length) {
    throw new AppError("ERR_ORDER_ITEMS_REQUIRED", 400);
  }

  if (ticketId != null) {
    const ticket = await Ticket.findOne({
      where: { id: ticketId, companyId }
    });
    if (!ticket) {
      throw new AppError("ERR_NO_TICKET_FOUND", 404);
    }
  }

  if (contactId != null) {
    const contact = await Contact.findOne({
      where: { id: contactId, companyId }
    });
    if (!contact) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }
  }

  const normalized = items.map((it, i) => {
    const qty = Number(it.qty) || 0;
    const unit = Number(it.unitPrice) || 0;
    const total =
      it.total != null && it.total !== ""
        ? Number(it.total)
        : Math.round(qty * unit * 100) / 100;
    return {
      code: it.code || String(i + 1),
      description: it.description || "",
      qty,
      unitPrice: unit,
      total
    };
  });

  const total = sumItems(normalized);
  const year = new Date().getFullYear();
  const orderCount = await TicketBudgetOrder.count({
    where: {
      companyId,
      createdAt: { [Op.gte]: new Date(`${year}-01-01`) }
    }
  });
  const orderNumber = `OS-${year}-${String(orderCount + 1).padStart(4, "0")}`;

  const order = await TicketBudgetOrder.create({
    companyId,
    budgetId: null,
    ticketId: ticketId ?? null,
    contactId: contactId ?? null,
    orderNumber,
    total,
    items: normalized
  });

  return order;
};

export default CreateStandaloneOrderService;
