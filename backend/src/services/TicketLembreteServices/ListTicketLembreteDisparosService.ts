import TicketLembrete from "../../models/TicketLembrete";
import TicketLembreteDisparo from "../../models/TicketLembreteDisparo";
import AppError from "../../errors/AppError";

const ListTicketLembreteDisparosService = async (
  ticketId: number,
  companyId: number,
  lembreteId: number,
  limit = 40
): Promise<{ disparos: TicketLembreteDisparo[] }> => {
  const lembrete = await TicketLembrete.findOne({
    where: { id: lembreteId, ticketId, companyId },
    attributes: ["id"]
  });
  if (!lembrete) {
    throw new AppError("ERR_LEMBRETE_NOT_FOUND", 404);
  }
  const disparos = await TicketLembreteDisparo.findAll({
    where: { lembreteId, ticketId, companyId },
    include: [
      {
        model: TicketLembrete,
        attributes: ["id", "nome", "descricao", "mensagemTemplate"]
      }
    ],
    order: [["createdAt", "DESC"]],
    limit: Math.min(Math.max(limit, 1), 100)
  });
  return { disparos };
};

export default ListTicketLembreteDisparosService;
