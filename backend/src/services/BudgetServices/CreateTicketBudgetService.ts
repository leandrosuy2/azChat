import { randomBytes } from "crypto";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import TicketBudget, { BudgetPayloadStored } from "../../models/TicketBudget";
import { normalizePayloadLikeCreate } from "./budgetPayloadUtils";

interface Request {
  companyId: number;
  userId: number;
  ticketId?: number | null;
  contactId?: number | null;
  validUntil?: string | null;
  payload: BudgetPayloadStored;
}

const CreateTicketBudgetService = async ({
  companyId,
  userId,
  ticketId,
  contactId,
  validUntil,
  payload
}: Request): Promise<TicketBudget> => {
  if (ticketId != null) {
    const ticket = await Ticket.findOne({
      where: { id: ticketId, companyId }
    });
    if (!ticket) {
      throw new AppError("ERR_NO_TICKET_FOUND", 404);
    }
  }

  const normalized = normalizePayloadLikeCreate(payload);
  if (!normalized.items.length) {
    throw new AppError("ERR_BUDGET_ITEMS_REQUIRED", 400);
  }

  const publicToken = randomBytes(24).toString("hex");
  const year = new Date().getFullYear();
  const count = await TicketBudget.count({
    where: {
      companyId,
      createdAt: { [Op.gte]: new Date(`${year}-01-01`) }
    }
  });
  const budgetNumber = `ORC-${year}-${String(count + 1).padStart(4, "0")}`;

  const row = await TicketBudget.create({
    companyId,
    ticketId: ticketId ?? null,
    contactId: contactId ?? null,
    userId,
    publicToken,
    budgetNumber,
    status: "pending",
    validUntil: validUntil || null,
    payload: normalized
  });

  return row;
};

export default CreateTicketBudgetService;
