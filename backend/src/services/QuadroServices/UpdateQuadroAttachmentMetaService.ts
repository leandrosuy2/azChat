import TicketQuadroAnexo from "../../models/TicketQuadroAnexo";
import AppError from "../../errors/AppError";
import { resolveQuadroAttachmentScope } from "../../helpers/ResolveQuadroAttachmentScope";

const MAX_LEGENDA = 16000;

export interface UpdateQuadroAttachmentMetaInput {
  ticketUuid: string;
  companyId: number;
  attachmentId: number;
  legenda?: string;
  /** `undefined` = não alterar; `null` = anexo geral do cartão */
  processoBlocoId?: string | null;
}

const UpdateQuadroAttachmentMetaService = async (
  input: UpdateQuadroAttachmentMetaInput
): Promise<TicketQuadroAnexo> => {
  const { ticketUuid, companyId, attachmentId, legenda, processoBlocoId } = input;
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

  const patch: Record<string, unknown> = {};

  if (legenda !== undefined) {
    patch.legenda = String(legenda).slice(0, MAX_LEGENDA);
  }

  if (processoBlocoId !== undefined) {
    const nextBloco =
      processoBlocoId != null && String(processoBlocoId).trim() !== ""
        ? String(processoBlocoId).trim().slice(0, 36)
        : null;
    patch.processoBlocoId = nextBloco;
    if (nextBloco != null && anexo.isCapa) {
      patch.isCapa = false;
    }
  }

  if (Object.keys(patch).length === 0) {
    return anexo;
  }

  await anexo.update(patch);
  return anexo.reload();
};

export default UpdateQuadroAttachmentMetaService;
