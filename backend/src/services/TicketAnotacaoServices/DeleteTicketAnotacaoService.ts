import path from "path";
import fs from "fs";
import Ticket from "../../models/Ticket";
import TicketAnotacao from "../../models/TicketAnotacao";
import AppError from "../../errors/AppError";

const DeleteTicketAnotacaoService = async (
  ticketId: number,
  companyId: number,
  anotacaoId: number
): Promise<void> => {
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

  if (anotacao.arquivoPath) {
    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const filePath = path.resolve(
      publicFolder,
      `company${companyId}`,
      "anotacoes",
      String(ticketId),
      anotacao.arquivoPath
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await anotacao.destroy();
};

export default DeleteTicketAnotacaoService;
