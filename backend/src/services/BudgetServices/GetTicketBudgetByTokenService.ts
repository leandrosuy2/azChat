import AppError from "../../errors/AppError";
import TicketBudget from "../../models/TicketBudget";

const GetTicketBudgetByTokenService = async (
  publicToken: string
): Promise<TicketBudget> => {
  const row = await TicketBudget.findOne({
    where: { publicToken }
  });
  if (!row) {
    throw new AppError("ERR_NO_BUDGET_FOUND", 404);
  }
  return row;
};

export default GetTicketBudgetByTokenService;
