import Ticket from "../../models/Ticket";
import TicketLembrete from "../../models/TicketLembrete";
import AppError from "../../errors/AppError";

const ListTicketLembretesService = async (
  ticketId: number,
  companyId: number
): Promise<{ lembretes: TicketLembrete[] }> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const lembretes = await TicketLembrete.findAll({
    where: { ticketId, companyId },
    order: [["data", "ASC"], ["hora", "ASC"]]
  });

  return { lembretes };
};

export default ListTicketLembretesService;
