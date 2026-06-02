import AppError from "../../errors/AppError";
import ProductCategory from "../../models/ProductCategory";

interface Request {
  companyId: number;
  name: string;
  parentId?: number | null;
}

const CreateProductCategoryService = async ({
  companyId,
  name,
  parentId
}: Request): Promise<ProductCategory> => {
  const nameTrim = String(name || "").trim();
  if (!nameTrim) {
    throw new AppError("ERR_PRODUCT_CATEGORY_NAME_REQUIRED", 400);
  }

  let parent: ProductCategory | null = null;
  if (parentId) {
    parent = await ProductCategory.findOne({
      where: { id: parentId, companyId }
    });
    if (!parent) {
      throw new AppError("ERR_PRODUCT_CATEGORY_PARENT_NOT_FOUND", 404);
    }
    if (parent.parentId) {
      throw new AppError("ERR_PRODUCT_CATEGORY_MAX_DEPTH", 400);
    }
  }

  return ProductCategory.create({
    companyId,
    name: nameTrim,
    parentId: parent?.id || null
  });
};

export default CreateProductCategoryService;
