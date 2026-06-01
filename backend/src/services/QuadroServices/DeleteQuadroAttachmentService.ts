import TicketQuadroAnexo from "../../models/TicketQuadroAnexo";
import AppError from "../../errors/AppError";
import { resolveQuadroAttachmentScope } from "../../helpers/ResolveQuadroAttachmentScope";
import { quadroAttachmentDiskDir } from "../../helpers/QuadroAttachmentPaths";
import path from "path";
import fs from "fs";

const DeleteQuadroAttachmentService = async (
  ticketUuid: string,
  companyId: number,
  attachmentId: number
): Promise<void> => {
  const scope = await resolveQuadroAttachmentScope(ticketUuid, companyId);

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

  const dir = quadroAttachmentDiskDir(companyId, {
    ticketId: anexo.ticketId,
    ticketQuadroId: anexo.ticketQuadroId
  });
  const filePath = path.resolve(dir, anexo.path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await anexo.destroy();
};

export default DeleteQuadroAttachmentService;
