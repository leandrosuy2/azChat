import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";
import QuadroGroup from "../../models/QuadroGroup";
import ShowService from "./ShowService";

interface TagData {
  id?: number;
  name?: string;
  color?: string;
  kanban?: number;
  timeLane?: number;
  nextLaneId?: number;
  greetingMessageLane: string;
  rollbackLaneId?: number;
  /** Área do Kanban (quadro) — obrigatório para etapas kanban=1 */
  quadroGroupId?: number | string | null;
}

interface Request {
  tagData: TagData;
  id: string | number;
}

const UpdateUserService = async ({
  tagData,
  id
}: Request): Promise<Tag | undefined> => {
  const tag = await ShowService(id);

  const schema = Yup.object().shape({
    name: Yup.string().min(3)
  });

  const {
    name,
    color,
    kanban,
    timeLane,
    nextLaneId = null,
    greetingMessageLane,
    rollbackLaneId = null,
    quadroGroupId: quadroGroupIdBody
  } = tagData;

  try {
    await schema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const isKanbanLane = Number(kanban ?? tag.kanban) === 1;

  const updatePayload: Record<string, unknown> = {
    name,
    color,
    kanban,
    timeLane,
    nextLaneId: String(nextLaneId) === "" ? null : nextLaneId,
    greetingMessageLane,
    rollbackLaneId: String(rollbackLaneId) === "" ? null : rollbackLaneId
  };

  if (isKanbanLane) {
    let qid = tag.quadroGroupId;
    if (
      quadroGroupIdBody !== undefined &&
      quadroGroupIdBody !== null &&
      String(quadroGroupIdBody) !== ""
    ) {
      qid = Number(quadroGroupIdBody);
    }
    if (qid == null || Number.isNaN(Number(qid))) {
      throw new AppError("Selecione a área do Kanban para esta etapa.", 400);
    }
    const group = await QuadroGroup.findOne({
      where: { id: qid, companyId: tag.companyId }
    });
    if (!group) {
      throw new AppError("Área do Kanban inválida.", 400);
    }
    updatePayload.quadroGroupId = qid;
  }

  await tag.update(updatePayload);

  await tag.reload();
  return tag;
};

export default UpdateUserService;
