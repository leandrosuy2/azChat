import QuadroGroup from "../../models/QuadroGroup";

const ListQuadroGroupsService = async (companyId: number): Promise<QuadroGroup[]> => {
  let groups = await QuadroGroup.findAll({
    where: { companyId },
    order: [["createdAt", "ASC"]]
  });

  if (groups.length === 0) {
    const defaultGroup = await QuadroGroup.create({
      name: "Kanban",
      companyId
    });
    groups = [defaultGroup];
  }

  return groups;
};

export default ListQuadroGroupsService;
