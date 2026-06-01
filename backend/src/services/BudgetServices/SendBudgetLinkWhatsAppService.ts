import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import TicketBudget from "../../models/TicketBudget";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";

interface Request {
  budget: TicketBudget;
  ticket: Ticket;
  frontendBaseUrl: string;
}

const SendBudgetLinkWhatsAppService = async ({
  budget,
  ticket,
  frontendBaseUrl
}: Request): Promise<void> => {
  if (!ticket.contactId) {
    throw new AppError("ERR_TICKET_WITHOUT_CONTACT", 400);
  }
  const base = String(frontendBaseUrl || "").replace(/\/$/, "");
  if (!base) {
    throw new AppError("ERR_FRONTEND_URL_MISSING", 500);
  }
  const link = `${base}/orcamento/${budget.publicToken}`;
  const clientName =
    budget.payload?.client?.name?.trim() || "Cliente";
  const first = clientName.split(/\s+/)[0];
  const body = `Olá, ${first}!\nSegue seu orçamento.\nVocê pode visualizar e aprovar pelo link abaixo:\n${link}`;
  await SendWhatsAppMessage({ body, ticket });
};

export default SendBudgetLinkWhatsAppService;
