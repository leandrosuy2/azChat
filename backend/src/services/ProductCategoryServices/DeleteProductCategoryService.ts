import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Product from "../../models/Product";
import ProductCategory from "../../models/ProductCategory";

const DeleteProductCategoryService = async (
  id: number,
  companyId: number
): Promise<void> => {
  const category = await ProductCategory.findOne({
    where: { id, companyId }
  });
  if (!category) {
    throw new AppError("ERR_PRODUCT_CATEGORY_NOT_FOUND", 404);
  }

  const childrenCount = await ProductCategory.count({
    where: { parentId: id, companyId }
  });
  if (childrenCount > 0) {
    throw new AppError("ERR_PRODUCT_CATEGORY_HAS_CHILDREN", 400);
  }

  const linkedProducts = await Product.count({
    where: {
      companyId,
      [Op.or]: [{ categoryId: id }, { subcategoryId: id }]
    }
  });
  if (linkedProducts > 0) {
    throw new AppError("ERR_PRODUCT_CATEGORY_IN_USE", 400);
  }

  await category.destroy();
};

export default DeleteProductCategoryService;
