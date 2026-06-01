import Tag from "../../models/Tag";

interface Request {
  companyId: number;
  quadroGroupId: number;
}

const KanbanListService = async ({
  companyId,
  quadroGroupId
}: Request): Promise<Tag[]> => {
  const tags = await Tag.findAll({
    where: {
      kanban: 1,
      companyId,
      quadroGroupId
    },
    order: [["id", "ASC"]],
    raw: true
  });
  return tags;
};

export default KanbanListService;