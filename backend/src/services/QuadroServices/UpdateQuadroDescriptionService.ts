import TicketQuadro from "../../models/TicketQuadro";
import { resolveQuadroContext, ensureQuadroRowForTicket } from "../../helpers/ResolveQuadroFromPublicParam";
import {
  isUnlinkedMirrorView,
  mergeUnlinkedMirrorPayload,
  parseViewQuadroGroupId
} from "../../helpers/UnlinkedMirrorQuadro";

const UpdateQuadroDescriptionService = async (
  publicParam: string,
  companyId: number,
  description: string,
  viewQuadroGroupId?: number | null
): Promise<TicketQuadro> => {
  const viewGid = parseViewQuadroGroupId(viewQuadroGroupId);
  const ctx = await resolveQuadroContext(publicParam, companyId);

  if (ctx.mode === "ticket") {
    let quadro = ctx.quadro;
    if (!quadro) {
      quadro = await ensureQuadroRowForTicket(ctx.ticket.id, companyId, {
        status: "aguardando",
        description: description || null
      });
      return quadro;
    }
    if (viewGid && isUnlinkedMirrorView(quadro, viewGid)) {
      await mergeUnlinkedMirrorPayload(quadro, viewGid, {
        description: description || null
      });
      return quadro.reload();
    }
    await quadro.update({ description: description || null });
    return quadro.reload();
  }

  if (viewGid && isUnlinkedMirrorView(ctx.quadro, viewGid)) {
    await mergeUnlinkedMirrorPayload(ctx.quadro, viewGid, {
      description: description || null
    });
    return ctx.quadro.reload();
  }

  await ctx.quadro.update({ description: description || null });
  return ctx.quadro.reload();
};

export default UpdateQuadroDescriptionService;
