import AppError from "../../errors/AppError";
import TicketBudget from "../../models/TicketBudget";

const ShowTicketBudgetService = async (
  id: number,
  companyId: number
): Promise<TicketBudget> => {
  const row = await TicketBudget.findOne({
    where: { id, companyId }
  });
  if (!row) {
    throw new AppError("ERR_NO_BUDGET_FOUND", 404);
  }
  return row;
};

export default ShowTicketBudgetService;
