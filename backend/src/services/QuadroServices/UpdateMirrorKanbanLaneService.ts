import TicketQuadro from "../../models/TicketQuadro";
import Tag from "../../models/Tag";
import AppError from "../../errors/AppError";

function sharedGroupIdsAsNumbers(raw: unknown): number[] {
  if (raw == null) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      arr = Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  } else {
    return [];
  }
  return arr.map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

interface Request {
  /** Positivo = ticket normal; negativo = `-TicketQuadros.id` (standalone). */
  ticketId: number;
  companyId: number;
  /** Área do Kanban onde o cartão aparece como espelho (não é a “casa” do quadro). */
  mirrorGroupId: number;
  /** Tag Kanban da coluna destino nesta área; `null` = sem etapa só no espelho. */
  stageTagId: number | null;
}

/**
 * Move coluna apenas no espelho: atualiza `sharedStagesByGroup[mirrorGroupId]`.
 * Não altera TicketTag nem `kanbanTagId` (coluna na área de origem).
 */
const UpdateMirrorKanbanLaneService = async ({
  ticketId,
  companyId,
  mirrorGroupId,
  stageTagId
}: Request): Promise<TicketQuadro> => {
  if (!Number.isFinite(mirrorGroupId) || mirrorGroupId <= 0) {
    throw new AppError("mirrorGroupId inválido.", 400);
  }

  let quadro: TicketQuadro | null;
  if (ticketId < 0) {
    quadro = await TicketQuadro.findOne({
      where: { id: Math.abs(ticketId), companyId, ticketId: null }
    });
  } else {
    quadro = await TicketQuadro.findOne({
      where: { ticketId, companyId }
    });
  }

  if (!quadro) {
    throw new AppError("Quadro não encontrado para este cartão.", 404);
  }

  const shared = sharedGroupIdsAsNumbers(quadro.sharedGroupIds);
  if (!shared.includes(mirrorGroupId)) {
    throw new AppError("Cartão não está compartilhado nesta área.", 400);
  }

  const homeGid =
    quadro.quadroGroupId != null ? Number(quadro.quadroGroupId) : NaN;
  if (Number.isFinite(homeGid) && homeGid === mirrorGroupId) {
    throw new AppError("Use a movimentação normal de coluna neste quadro.", 400);
  }

  if (stageTagId != null) {
    const tag = await Tag.findOne({
      where: {
        id: stageTagId,
        companyId,
        kanban: 1,
        quadroGroupId: mirrorGroupId
      }
    });
    if (!tag) {
      throw new AppError("Etapa inválida para esta área.", 400);
    }
  }

  const prev = quadro.sharedStagesByGroup || {};
  const merged: Record<string, number[]> = { ...prev };
  merged[String(mirrorGroupId)] =
    stageTagId != null ? [stageTagId] : [];

  await quadro.update({ sharedStagesByGroup: merged });
  await quadro.reload();
  return quadro;
};

export default UpdateMirrorKanbanLaneService;
