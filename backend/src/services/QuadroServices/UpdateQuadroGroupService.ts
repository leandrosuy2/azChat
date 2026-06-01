import AppError from "../../errors/AppError";
import QuadroGroup from "../../models/QuadroGroup";

interface Request {
  id: number;
  name: string;
  companyId: number;
}

const UpdateQuadroGroupService = async ({ id, name, companyId }: Request): Promise<QuadroGroup> => {
  const group = await QuadroGroup.findOne({ where: { id, companyId } });

  if (!group) {
    throw new AppError("Área não encontrada", 404);
  }

  await group.update({ name: name.trim() });
  return group;
};

export default UpdateQuadroGroupService;
