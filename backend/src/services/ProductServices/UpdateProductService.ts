import AppError from "../../errors/AppError";
import Product from "../../models/Product";
import {
  resolveCategoryLabels,
  validateCategoryRefs
} from "./productCategoryHelpers";

interface Request {
  id: number;
  companyId: number;
  name?: string;
  description?: string;
  category?: string;
  categoryId?: number | null;
  subcategoryId?: number | null;
  code?: string;
  unit?: string;
  price?: number;
  costPrice?: number;
  status?: string;
  imageUrl?: string;
  internalNotes?: string;
}

const UpdateProductService = async (data: Request): Promise<Product> => {
  const product = await Product.findOne({
    where: { id: data.id, companyId: data.companyId }
  });
  if (!product) {
    throw new AppError("ERR_PRODUCT_NOT_FOUND", 404);
  }

  if (data.name != null) {
    const nameTrim = String(data.name).trim();
    if (!nameTrim) throw new AppError("ERR_PRODUCT_NAME_REQUIRED", 400);
    product.name = nameTrim;
  }
  if (data.description !== undefined) {
    product.description = data.description?.trim() || null;
  }
  if (data.categoryId !== undefined || data.subcategoryId !== undefined) {
    const categoryId =
      data.categoryId !== undefined ? data.categoryId : product.categoryId;
    const subcategoryId =
      data.subcategoryId !== undefined
        ? data.subcategoryId
        : product.subcategoryId;
    await validateCategoryRefs(data.companyId, categoryId, subcategoryId);
    product.categoryId = categoryId || null;
    product.subcategoryId = subcategoryId || null;
    product.category =
      data.category?.trim() ||
      (await resolveCategoryLabels({
        companyId: data.companyId,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId
      }));
  } else if (data.category !== undefined) {
    product.category = data.category?.trim() || null;
  }
  if (data.code !== undefined) {
    product.code = data.code?.trim() || null;
  }
  if (data.unit !== undefined) {
    product.unit = data.unit?.trim() || "un";
  }
  if (data.price != null) {
    product.price = Number(data.price) || 0;
  }
  if (data.costPrice != null) {
    product.costPrice = Number(data.costPrice) || 0;
  }
  if (data.status != null) {
    product.status = data.status === "inactive" ? "inactive" : "active";
  }
  if (data.imageUrl !== undefined) {
    product.imageUrl = data.imageUrl?.trim() || null;
  }
  if (data.internalNotes !== undefined) {
    product.internalNotes = data.internalNotes?.trim() || null;
  }

  await product.save();
  return product;
};

export default UpdateProductService;
