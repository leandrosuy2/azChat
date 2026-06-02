import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Product from "../../models/Product";
import ProductCategory from "../../models/ProductCategory";

interface ResolveCategoryLabelsParams {
  companyId: number;
  categoryId?: number | null;
  subcategoryId?: number | null;
}

export const resolveCategoryLabels = async ({
  companyId,
  categoryId,
  subcategoryId
}: ResolveCategoryLabelsParams): Promise<string | null> => {
  const parts: string[] = [];

  if (categoryId) {
    const cat = await ProductCategory.findOne({
      where: { id: categoryId, companyId }
    });
    if (cat) parts.push(cat.name);
  }

  if (subcategoryId) {
    const sub = await ProductCategory.findOne({
      where: { id: subcategoryId, companyId }
    });
    if (sub) parts.push(sub.name);
  }

  return parts.length ? parts.join(" / ") : null;
};

export const validateCategoryRefs = async (
  companyId: number,
  categoryId?: number | null,
  subcategoryId?: number | null
): Promise<void> => {
  if (categoryId) {
    const cat = await ProductCategory.findOne({
      where: { id: categoryId, companyId, parentId: { [Op.is]: null } }
    });
    if (!cat) {
      throw new AppError("ERR_PRODUCT_CATEGORY_NOT_FOUND", 404);
    }
  }

  if (subcategoryId) {
    const sub = await ProductCategory.findOne({
      where: { id: subcategoryId, companyId }
    });
    if (!sub || !sub.parentId) {
      throw new AppError("ERR_PRODUCT_SUBCATEGORY_NOT_FOUND", 404);
    }
    if (categoryId && sub.parentId !== categoryId) {
      throw new AppError("ERR_PRODUCT_SUBCATEGORY_MISMATCH", 400);
    }
  }
};
