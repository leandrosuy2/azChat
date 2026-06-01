import Ticket from "../../models/Ticket";
import TicketEvento from "../../models/TicketEvento";
import AppError from "../../errors/AppError";

const DeleteTicketEventoService = async (
  ticketId: number,
  companyId: number,
  eventoId: number
): Promise<void> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const evento = await TicketEvento.findOne({
    where: { id: eventoId, ticketId, companyId }
  });

  if (!evento) {
    throw new AppError("ERR_EVENTO_NOT_FOUND", 404);
  }

  await evento.destroy();
};

export default DeleteTicketEventoService;
