import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import sequelize from "../../database";
import QuadroGroup from "../../models/QuadroGroup";
import Ticket from "../../models/Ticket";
import TicketQuadro from "../../models/TicketQuadro";

interface Request {
  id: number;
  companyId: number;
}

/**
 * Remove uma área de trabalho. Cartões e quadros que estavam só nela
 * passam para outra área da empresa — não ficam órfãos (quadroGroupId null),
 * o que no Kanban os fazia aparecer só na primeira área.
 */
const DeleteQuadroGroupService = async ({ id, companyId }: Request): Promise<void> => {
  const group = await QuadroGroup.findOne({ where: { id, companyId } });

  if (!group) {
    throw new AppError("Área não encontrada", 404);
  }

  const fallback = await QuadroGroup.findOne({
    where: { companyId, id: { [Op.ne]: id } },
    order: [["id", "ASC"]]
  });

  const t = await sequelize.transaction();
  try {
    if (fallback) {
      await Ticket.update(
        { quadroGroupId: fallback.id },
        { where: { quadroGroupId: id, companyId }, transaction: t }
      );
      await TicketQuadro.update(
        { quadroGroupId: fallback.id },
        { where: { quadroGroupId: id, companyId }, transaction: t }
      );
    } else {
      await Ticket.update(
        { quadroGroupId: null },
        { where: { quadroGroupId: id, companyId }, transaction: t }
      );
      await TicketQuadro.update(
        { quadroGroupId: null },
        { where: { quadroGroupId: id, companyId }, transaction: t }
      );
    }

    const quadros = await TicketQuadro.findAll({
      where: { companyId },
      attributes: ["id", "sharedGroupIds"],
      transaction: t
    });
    for (const q of quadros) {
      const arr = q.sharedGroupIds || [];
      if (!Array.isArray(arr) || !arr.some((g) => Number(g) === Number(id))) continue;
      const next = arr.filter((g) => Number(g) !== Number(id));
      await q.update({ sharedGroupIds: next }, { transaction: t });
    }

    await group.destroy({ transaction: t });
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

export default DeleteQuadroGroupService;
