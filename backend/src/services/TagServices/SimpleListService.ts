import { Op, Sequelize } from "sequelize";
import Tag from "../../models/Tag";
import Contact from "../../models/Contact";

/** Etapas só para filtro na inbox (sem quadro Kanban). */
export const INBOX_FUNNEL_FILTER_KANBAN = 2;

interface Request {
  companyId: number;
  searchParam?: string;
  kanban?: number;
  /** Obrigatório quando kanban=1 — filtra colunas do quadro */
  quadroGroupId?: number;
}

const ListService = async ({
  companyId,
  searchParam,
  kanban = 0,
  quadroGroupId
}: Request): Promise<Tag[]> => {
  let whereCondition = {};

  if (Number(kanban) === 1) {
    if (quadroGroupId == null || Number.isNaN(Number(quadroGroupId))) {
      return [];
    }
    const kbBase = {
      companyId,
      kanban: 1,
      quadroGroupId: Number(quadroGroupId)
    };
    const kbWhere = searchParam
      ? {
          ...kbBase,
          [Op.or]: [
            { name: { [Op.like]: `%${searchParam}%` } },
            { color: { [Op.like]: `%${searchParam}%` } }
          ]
        }
      : kbBase;
    return Tag.findAll({
      where: kbWhere,
      order: [["name", "ASC"]],
      attributes: ["id", "name", "color", "kanban", "quadroGroupId"]
    });
  }

  /** Nulls por último sem SQL dialect-específico (crases quebram no PostgreSQL). */
  const inboxOrderClause = [
    [Sequelize.fn("COALESCE", Sequelize.col("Tag.inboxOrder"), 2147483647), "ASC"],
    ["name", "ASC"],
  ];

  if (Number(kanban) === INBOX_FUNNEL_FILTER_KANBAN) {
    const base = { companyId, kanban: INBOX_FUNNEL_FILTER_KANBAN };
    const kbWhere = searchParam
      ? {
          ...base,
          [Op.or]: [
            { name: { [Op.like]: `%${searchParam}%` } },
            { color: { [Op.like]: `%${searchParam}%` } }
          ]
        }
      : base;
    return Tag.findAll({
      where: kbWhere,
      order: inboxOrderClause as import("sequelize").Order,
      attributes: ["id", "name", "color", "kanban", "quadroGroupId", "inboxOrder"]
    });
  }

  if (searchParam) {
    whereCondition = {
      [Op.or]: [
        { name: { [Op.like]: `%${searchParam}%` } },
        { color: { [Op.like]: `%${searchParam}%` } }
      ]
    };
  }

  const tags = await Tag.findAll({
    where: { ...whereCondition, companyId, kanban },
    order: inboxOrderClause as import("sequelize").Order,
    include: [
      {
        model: Contact,
        as: "contacts"
      }
    ],
    attributes: {
      exclude: ["createdAt", "updatedAt"],
      include: [
        [Sequelize.fn("COUNT", Sequelize.col("contacts.id")), "contactsCount"]
      ]
    },
    group: [
      "Tag.id",
      "Tag.inboxOrder",
      "contacts.ContactTag.tagId",
      "contacts.ContactTag.contactId",
      "contacts.ContactTag.createdAt",
      "contacts.ContactTag.updatedAt",
      "contacts.id"
    ]
  });

  return tags;
};

export default ListService;
