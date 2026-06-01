import TicketQuadro from "../../models/TicketQuadro";
import AppError from "../../errors/AppError";
import { resolveQuadroContext, ensureQuadroRowForTicket } from "../../helpers/ResolveQuadroFromPublicParam";
import {
  isUnlinkedMirrorView,
  mergeUnlinkedMirrorPayload,
  parseViewQuadroGroupId
} from "../../helpers/UnlinkedMirrorQuadro";

/**
 * Atualiza apenas o status interno do quadro (TicketQuadro.status).
 * Aceita UUID do ticket ou UUID do quadro (quadro livre).
 */
const UpdateQuadroStatusService = async (
  publicParam: string,
  companyId: number,
  status: string,
  viewQuadroGroupId?: number | null
): Promise<TicketQuadro> => {
  const viewGid = parseViewQuadroGroupId(viewQuadroGroupId);
  const s = typeof status === "string" ? status.trim() : "";
  if (!s || s.length > 120) {
    throw new AppError("ERR_QUADRO_INVALID_STATUS", 400);
  }

  const ctx = await resolveQuadroContext(publicParam, companyId);

  if (ctx.mode === "ticket") {
    let quadro = ctx.quadro;
    if (!quadro) {
      quadro = await ensureQuadroRowForTicket(ctx.ticket.id, companyId);
    }
    if (viewGid && isUnlinkedMirrorView(quadro, viewGid)) {
      await mergeUnlinkedMirrorPayload(quadro, viewGid, { status: s });
      return quadro.reload();
    }
    await quadro.update({ status: s });
    return quadro.reload();
  }

  if (viewGid && isUnlinkedMirrorView(ctx.quadro, viewGid)) {
    await mergeUnlinkedMirrorPayload(ctx.quadro, viewGid, { status: s });
    return ctx.quadro.reload();
  }

  await ctx.quadro.update({ status: s });
  return ctx.quadro.reload();
};

export default UpdateQuadroStatusService;
