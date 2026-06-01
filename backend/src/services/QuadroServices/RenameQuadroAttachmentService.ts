import TicketQuadroAnexo from "../../models/TicketQuadroAnexo";
import AppError from "../../errors/AppError";
import { resolveQuadroAttachmentScope } from "../../helpers/ResolveQuadroAttachmentScope";

const RenameQuadroAttachmentService = async (
  ticketIdOrUuid: string,
  companyId: number,
  attachmentId: number,
  name: string
): Promise<TicketQuadroAnexo> => {
  const scope = await resolveQuadroAttachmentScope(ticketIdOrUuid, companyId);

  const anexo = await TicketQuadroAnexo.findOne({
    where: { id: attachmentId }
  });

  if (!anexo) {
    throw new AppError("ERR_QUADRO_ATTACHMENT_NOT_FOUND", 404);
  }

  const matchTicket = scope.ticketId != null && anexo.ticketId === scope.ticketId;
  const matchQuadro = scope.ticketQuadroId != null && anexo.ticketQuadroId === scope.ticketQuadroId;
  if (!matchTicket && !matchQuadro) {
    throw new AppError("ERR_QUADRO_ATTACHMENT_NOT_FOUND", 404);
  }

  const trimmedName = (name || "").trim();
  if (!trimmedName) {
    throw new AppError("ERR_QUADRO_ATTACHMENT_NAME_REQUIRED", 400);
  }

  await anexo.update({ name: trimmedName });
  return anexo;
};

export default RenameQuadroAttachmentService;
