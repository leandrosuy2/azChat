import AppError from "../../errors/AppError";
import TicketBudget, { BudgetPayloadStored } from "../../models/TicketBudget";

const RejectTicketBudgetService = async (
  budget: TicketBudget,
  reason?: string | null
): Promise<TicketBudget> => {
  if (budget.status !== "pending") {
    throw new AppError("ERR_BUDGET_NOT_PENDING", 400);
  }
  const trimmed = reason != null ? String(reason).trim() : "";
  const prev = (budget.payload || {}) as BudgetPayloadStored;
  const nextPayload: BudgetPayloadStored = { ...prev };
  if (trimmed) {
    nextPayload.rejectionReason = trimmed;
  } else {
    delete nextPayload.rejectionReason;
  }
  await budget.update({
    status: "rejected",
    rejectedAt: new Date(),
    payload: nextPayload
  });
  return budget.reload();
};

export default RejectTicketBudgetService;
