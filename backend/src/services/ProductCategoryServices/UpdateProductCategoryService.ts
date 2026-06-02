import AppError from "../../errors/AppError";
import ProductCategory from "../../models/ProductCategory";

interface Request {
  id: number;
  companyId: number;
  name?: string;
}

const UpdateProductCategoryService = async ({
  id,
  companyId,
  name
}: Request): Promise<ProductCategory> => {
  const category = await ProductCategory.findOne({
    where: { id, companyId }
  });
  if (!category) {
    throw new AppError("ERR_PRODUCT_CATEGORY_NOT_FOUND", 404);
  }

  if (name != null) {
    const nameTrim = String(name).trim();
    if (!nameTrim) {
      throw new AppError("ERR_PRODUCT_CATEGORY_NAME_REQUIRED", 400);
    }
    category.name = nameTrim;
  }

  await category.save();
  return category;
};

export default UpdateProductCategoryService;
