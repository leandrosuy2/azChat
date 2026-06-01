import Ticket from "../../models/Ticket";
import TicketEvento from "../../models/TicketEvento";
import AppError from "../../errors/AppError";

const ListTicketEventosService = async (
  ticketId: number,
  companyId: number
): Promise<{ eventos: TicketEvento[] }> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const eventos = await TicketEvento.findAll({
    where: { ticketId, companyId },
    order: [["data", "ASC"], ["hora", "ASC"]]
  });

  return { eventos };
};

export default ListTicketEventosService;
