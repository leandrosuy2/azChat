import AppError from "../../errors/AppError";
import ProductUnit from "../../models/ProductUnit";

const ListProductUnitsService = async (
  companyId: number
): Promise<ProductUnit[]> =>
  ProductUnit.findAll({
    where: { companyId },
    order: [["name", "ASC"]]
  });

const DeleteProductUnitService = async (
  id: number,
  companyId: number
): Promise<void> => {
  const unit = await ProductUnit.findOne({ where: { id, companyId } });
  if (!unit) {
    throw new AppError("ERR_PRODUCT_UNIT_NOT_FOUND", 404);
  }
  await unit.destroy();
};

export { ListProductUnitsService, DeleteProductUnitService };
