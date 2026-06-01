import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";
import { INBOX_FUNNEL_FILTER_KANBAN } from "./SimpleListService";

const ALLOWED_KANBAN = new Set([0, INBOX_FUNNEL_FILTER_KANBAN]);

/**
 * Persiste a ordem das tags de categoria (0) ou etapa do funil da inbox (2).
 * `tagIds` deve listar **todas** as tags daquele kanban da empresa, na ordem desejada.
 */
const InboxTagReorderService = async ({
  companyId,
  kanban,
  tagIds,
}: {
  companyId: number;
  kanban: number;
  tagIds: number[];
}): Promise<void> => {
  const kb = Number(kanban);
  if (!ALLOWED_KANBAN.has(kb)) {
    throw new AppError("Kanban inválido para reordenação da inbox.", 400);
  }
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    throw new AppError("tagIds é obrigatório.", 400);
  }

  const nums = tagIds.map(x => Number(x)).filter(n => !Number.isNaN(n));
  if (nums.length !== tagIds.length) {
    throw new AppError("tagIds inválidos.", 400);
  }

  const allForKb = await Tag.findAll({
    where: { companyId, kanban: kb },
    attributes: ["id"],
  });
  const expected = new Set(allForKb.map(t => t.id));
  const received = new Set(nums);

  if (expected.size !== received.size) {
    throw new AppError(
      "Lista de tags incompleta ou duplicada: envie exatamente todas as tags desta seção.",
      400
    );
  }
  for (const id of expected) {
    if (!received.has(id)) {
      throw new AppError(
        "Lista de tags incompleta: envie exatamente todas as tags desta seção.",
        400
      );
    }
  }

  const sequelize = Tag.sequelize!;
  await sequelize.transaction(async transaction => {
    for (let i = 0; i < nums.length; i++) {
      await Tag.update(
        { inboxOrder: i },
        { where: { id: nums[i], companyId, kanban: kb }, transaction }
      );
    }
  });
};

export default InboxTagReorderService;
