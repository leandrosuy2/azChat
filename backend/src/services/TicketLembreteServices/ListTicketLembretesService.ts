import Ticket from "../../models/Ticket";
import TicketLembrete from "../../models/TicketLembrete";
import AppError from "../../errors/AppError";
import { Op } from "sequelize";

const ListTicketLembretesService = async (
  ticketId: number,
  companyId: number,
  userId?: number
): Promise<{ lembretes: TicketLembrete[] }> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id", "userId"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const visibleByUser =
    userId != null
      ? {
          [Op.or]: [
            { destinoTipo: { [Op.is]: null } },
            { destinoTipo: "interno", destinoId: { [Op.is]: null } },
            { destinoTipo: "geral" },
            { destinoTipo: "usuario", destinoId: userId },
            { destinoTipo: "responsavel", destinoId: userId },
            ...(Number(ticket.userId) === Number(userId)
              ? [{ destinoTipo: "responsavel", destinoId: { [Op.is]: null } }]
              : [])
          ]
        }
      : {};

  const lembretes = await TicketLembrete.findAll({
    where: { ticketId, companyId, ...visibleByUser },
    order: [["data", "ASC"], ["hora", "ASC"]]
  });

  return { lembretes };
};

export default ListTicketLembretesService;
