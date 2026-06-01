import Ticket from "../../models/Ticket";
import TicketAnotacao from "../../models/TicketAnotacao";
import AppError from "../../errors/AppError";

interface UpdateTicketAnotacaoData {
  status?: string;
  texto?: string;
}

const UpdateTicketAnotacaoService = async (
  ticketId: number,
  companyId: number,
  anotacaoId: number,
  data: UpdateTicketAnotacaoData
): Promise<TicketAnotacao> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const anotacao = await TicketAnotacao.findOne({
    where: { id: anotacaoId, ticketId, companyId }
  });

  if (!anotacao) {
    throw new AppError("ERR_ANOTACAO_NOT_FOUND", 404);
  }

  const updateData: Partial<{ status: string; texto: string }> = {};
  if (data.status !== undefined) {
    const statusValidos = ["aberta", "concluída", "pendente"];
    updateData.status = statusValidos.includes(data.status.toLowerCase())
      ? data.status.toLowerCase()
      : anotacao.status;
  }
  if (data.texto !== undefined) {
    updateData.texto = data.texto.trim() || anotacao.texto;
  }

  await anotacao.update(updateData);
  return anotacao;
};

export default UpdateTicketAnotacaoService;
