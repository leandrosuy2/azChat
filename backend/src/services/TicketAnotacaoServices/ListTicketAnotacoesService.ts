import Ticket from "../../models/Ticket";
import TicketAnotacao from "../../models/TicketAnotacao";
import AppError from "../../errors/AppError";

function buildArquivoUrl(companyId: number, ticketId: number, path: string): string {
  const base = `${process.env.BACKEND_URL}${process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""}`;
  return `${base}/public/company${companyId}/anotacoes/${ticketId}/${path}`;
}

const ListTicketAnotacoesService = async (
  ticketId: number,
  companyId: number
): Promise<{ anotacoes: any[] }> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const rows = await TicketAnotacao.findAll({
    where: { ticketId, companyId },
    order: [["createdAt", "DESC"]]
  });

  const anotacoes = rows.map((a) => ({
    id: a.id,
    ticketId: a.ticketId,
    eventoId: a.eventoId,
    texto: a.texto,
    arquivoNome: a.arquivoNome,
    arquivoUrl: a.arquivoPath
      ? buildArquivoUrl(companyId, ticketId, a.arquivoPath)
      : null,
    status: a.status,
    createdAt: a.createdAt
  }));

  return { anotacoes };
};

export default ListTicketAnotacoesService;
