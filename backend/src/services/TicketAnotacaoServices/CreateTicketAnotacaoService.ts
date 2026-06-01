import Ticket from "../../models/Ticket";
import TicketAnotacao from "../../models/TicketAnotacao";
import AppError from "../../errors/AppError";

function buildArquivoUrl(companyId: number, ticketId: number, path: string): string {
  const base = `${process.env.BACKEND_URL}${process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""}`;
  return `${base}/public/company${companyId}/anotacoes/${ticketId}/${path}`;
}

interface CreateTicketAnotacaoData {
  texto: string;
  eventoId?: number | null;
  status?: string;
  arquivoNome?: string | null;
  arquivoPath?: string | null;
}

const CreateTicketAnotacaoService = async (
  ticketId: number,
  companyId: number,
  data: CreateTicketAnotacaoData
): Promise<TicketAnotacao> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const texto = (data.texto || "").trim();
  if (!texto) {
    throw new AppError("ERR_ANOTACAO_TEXTO_REQUIRED", 400);
  }

  const status = (data.status || "aberta").toLowerCase();
  const statusValidos = ["aberta", "concluída", "pendente"];
  const statusFinal = statusValidos.includes(status) ? status : "aberta";

  const anotacao = await TicketAnotacao.create({
    ticketId,
    companyId,
    texto,
    eventoId: data.eventoId ?? null,
    status: statusFinal,
    arquivoNome: data.arquivoNome ?? null,
    arquivoPath: data.arquivoPath ?? null
  });

  return anotacao;
};

export const buildAnotacaoResponse = (
  a: TicketAnotacao,
  companyId: number,
  ticketId: number
) => ({
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
});

export default CreateTicketAnotacaoService;
