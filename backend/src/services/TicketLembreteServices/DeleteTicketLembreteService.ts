import Ticket from "../../models/Ticket";
import TicketLembrete from "../../models/TicketLembrete";
import AppError from "../../errors/AppError";

const DeleteTicketLembreteService = async (
  ticketId: number,
  companyId: number,
  lembreteId: number
): Promise<void> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const lembrete = await TicketLembrete.findOne({
    where: { id: lembreteId, ticketId, companyId }
  });

  if (!lembrete) {
    throw new AppError("ERR_LEMBRETE_NOT_FOUND", 404);
  }

  await lembrete.destroy();
};

export default DeleteTicketLembreteService;
