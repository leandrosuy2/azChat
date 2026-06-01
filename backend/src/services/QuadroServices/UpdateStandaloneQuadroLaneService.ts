import TicketQuadro from "../../models/TicketQuadro";
import Tag from "../../models/Tag";
import AppError from "../../errors/AppError";

/**
 * Move coluna Kanban (tag) para quadro livre — atualiza kanbanTagId.
 */
const UpdateStandaloneQuadroLaneService = async (
  quadroUuid: string,
  companyId: number,
  targetLaneId: string | null
): Promise<TicketQuadro> => {
  const quadro = await TicketQuadro.findOne({
    where: { uuid: quadroUuid.trim(), companyId, ticketId: null }
  });

  if (!quadro) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  if (targetLaneId == null || targetLaneId === "" || targetLaneId === "null") {
    await quadro.update({ kanbanTagId: null });
    return quadro.reload();
  }

  const tagId = parseInt(String(targetLaneId), 10);
  if (Number.isNaN(tagId)) {
    throw new AppError("ERR_INVALID_TAG", 400);
  }

  const tag = await Tag.findOne({
    where: {
      id: tagId,
      companyId,
      kanban: 1,
      quadroGroupId: quadro.quadroGroupId ?? null
    }
  });
  if (!tag) {
    throw new AppError("ERR_INVALID_TAG", 400);
  }

  await quadro.update({ kanbanTagId: tagId });
  return quadro.reload();
};

export default UpdateStandaloneQuadroLaneService;
