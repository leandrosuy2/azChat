import AppError from "../../errors/AppError";
import TicketBudget, { BudgetPayloadStored } from "../../models/TicketBudget";
import { normalizePayloadLikeCreate } from "./budgetPayloadUtils";

interface Request {
  id: number;
  companyId: number;
  validUntil?: string | null;
  payload: BudgetPayloadStored;
}

const UpdateTicketBudgetService = async ({
  id,
  companyId,
  validUntil,
  payload
}: Request): Promise<TicketBudget> => {
  const row = await TicketBudget.findOne({ where: { id, companyId } });
  if (!row) {
    throw new AppError("ERR_NO_BUDGET_FOUND", 404);
  }
  if (row.status !== "pending") {
    throw new AppError("ERR_BUDGET_NOT_EDITABLE", 400);
  }

  const normalized = normalizePayloadLikeCreate(payload);
  if (!normalized.items.length) {
    throw new AppError("ERR_BUDGET_ITEMS_REQUIRED", 400);
  }

  await row.update({
    validUntil: validUntil ?? row.validUntil,
    payload: normalized
  });
  return row.reload();
};

export default UpdateTicketBudgetService;
