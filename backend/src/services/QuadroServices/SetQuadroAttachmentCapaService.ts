import TicketQuadroAnexo from "../../models/TicketQuadroAnexo";
import AppError from "../../errors/AppError";
import { resolveQuadroAttachmentScope } from "../../helpers/ResolveQuadroAttachmentScope";
import { quadroAttachmentPublicUrl } from "../../helpers/QuadroAttachmentPaths";

const SetQuadroAttachmentCapaService = async (
  ticketUuid: string,
  companyId: number,
  attachmentId: number
): Promise<
  Array<{
    id: number;
    name: string;
    url: string;
    isCapa: boolean;
    createdAt: Date;
    processoBlocoId: string | null;
    legenda: string | null;
  }>
> => {
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

  const bloco = (anexo as { processoBlocoId?: string | null }).processoBlocoId;
  if (bloco != null && String(bloco).trim() !== "") {
    throw new AppError("ERR_QUADRO_CAPA_ONLY_GLOBAL_ATTACHMENT", 400);
  }

  const scopeWhere =
    scope.ticketId != null
      ? { ticketId: scope.ticketId }
      : { ticketQuadroId: scope.ticketQuadroId! };

  await TicketQuadroAnexo.update({ isCapa: false }, { where: scopeWhere as Record<string, number> });
  await anexo.update({ isCapa: true });

  const all = await TicketQuadroAnexo.findAll({
    where: scopeWhere as Record<string, number>,
    order: [["createdAt", "ASC"]]
  });

  return all.map((a) => ({
    id: a.id,
    name: a.name,
    url: quadroAttachmentPublicUrl(companyId, a.path, {
      ticketId: a.ticketId,
      ticketQuadroId: a.ticketQuadroId
    }),
    isCapa: a.isCapa,
    createdAt: a.createdAt,
    processoBlocoId: a.processoBlocoId ?? null,
    legenda: a.legenda ?? null
  }));
};

export default SetQuadroAttachmentCapaService;
