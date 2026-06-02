import AppError from "../../errors/AppError";
import ProductUnit from "../../models/ProductUnit";

interface Request {
  companyId: number;
  name: string;
  abbreviation?: string;
}

const CreateProductUnitService = async ({
  companyId,
  name,
  abbreviation
}: Request): Promise<ProductUnit> => {
  const nameTrim = String(name || "").trim();
  if (!nameTrim) {
    throw new AppError("ERR_PRODUCT_UNIT_NAME_REQUIRED", 400);
  }

  return ProductUnit.create({
    companyId,
    name: nameTrim,
    abbreviation: abbreviation?.trim() || nameTrim.slice(0, 10)
  });
};

export default CreateProductUnitService;
