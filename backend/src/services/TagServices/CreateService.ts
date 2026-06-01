import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";
import { INBOX_FUNNEL_FILTER_KANBAN } from "./SimpleListService";

interface Request {
  name: string;
  color: string;
  kanban: string;
  companyId: number;
  timeLane?: number;
  nextLaneId?: number;
  greetingMessageLane?: string;
  rollbackLaneId?: number;
  /** Obrigatório quando kanban é etapa do quadro (kanban=1) */
  quadroGroupId?: number;
}

const CreateService = async ({
  name,
  color = "#A4CCCC",
  kanban,
  companyId,
  timeLane = null,
  nextLaneId = null,
  greetingMessageLane = "",
  rollbackLaneId = null,
  quadroGroupId
}: Request): Promise<Tag> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(3)
  });

  try {
    await schema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const kb = Number(kanban) === 1;
  if (kb && (quadroGroupId == null || Number.isNaN(Number(quadroGroupId)))) {
    throw new AppError("Selecione a área do Kanban para criar a etapa.", 400);
  }

  const where: Record<string, unknown> = { name, color, kanban, companyId };
  if (kb) {
    where.quadroGroupId = Number(quadroGroupId);
  }

  const [tag, created] = await Tag.findOrCreate({
    where,
    defaults: {
      name,
      color,
      kanban,
      companyId,
      quadroGroupId: kb ? Number(quadroGroupId) : null,
      timeLane,
      nextLaneId: String(nextLaneId) === "" ? null : nextLaneId,
      greetingMessageLane,
      rollbackLaneId: String(rollbackLaneId) === "" ? null : rollbackLaneId
    }
  });

  const kNum = Number(kanban);
  if (
    created &&
    (kNum === 0 || kNum === INBOX_FUNNEL_FILTER_KANBAN)
  ) {
    const max = (await Tag.max("inboxOrder", {
      where: { companyId, kanban: kNum }
    })) as number | null;
    const next =
      typeof max === "number" && !Number.isNaN(max) ? max + 1 : 0;
    await tag.update({ inboxOrder: next });
  }

  await tag.reload();

  return tag;
};

export default CreateService;
