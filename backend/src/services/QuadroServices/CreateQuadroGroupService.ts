import AppError from "../../errors/AppError";
import QuadroGroup from "../../models/QuadroGroup";

interface Request {
  name: string;
  companyId: number;
}

const CreateQuadroGroupService = async ({ name, companyId }: Request): Promise<QuadroGroup> => {
  if (!name || !name.trim()) {
    throw new AppError("Nome é obrigatório", 400);
  }

  const group = await QuadroGroup.create({
    name: name.trim(),
    companyId
  });

  return group;
};

export default CreateQuadroGroupService;
