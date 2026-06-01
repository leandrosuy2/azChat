import TicketQuadro from "../../models/TicketQuadro";
import AppError from "../../errors/AppError";

const DeleteStandaloneTicketQuadroService = async (
  quadroUuid: string,
  companyId: number
): Promise<void> => {
  const quadro = await TicketQuadro.findOne({
    where: { uuid: quadroUuid.trim(), companyId, ticketId: null }
  });

  if (!quadro) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  await quadro.destroy();
};

export default DeleteStandaloneTicketQuadroService;
