import AppError from "../../errors/AppError";
import Product from "../../models/Product";
import {
  resolveCategoryLabels,
  validateCategoryRefs
} from "./productCategoryHelpers";

interface Request {
  companyId: number;
  name: string;
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

const CreateProductService = async (data: Request): Promise<Product> => {
  const nameTrim = String(data.name || "").trim();
  if (!nameTrim) {
    throw new AppError("ERR_PRODUCT_NAME_REQUIRED", 400);
  }

  await validateCategoryRefs(
    data.companyId,
    data.categoryId,
    data.subcategoryId
  );

  const categoryLabel =
    data.category?.trim() ||
    (await resolveCategoryLabels({
      companyId: data.companyId,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId
    }));

  return Product.create({
    companyId: data.companyId,
    name: nameTrim,
    description: data.description?.trim() || null,
    category: categoryLabel,
    categoryId: data.categoryId || null,
    subcategoryId: data.subcategoryId || null,
    code: data.code?.trim() || null,
    unit: data.unit?.trim() || "un",
    price: Number(data.price) || 0,
    costPrice: Number(data.costPrice) || 0,
    status: data.status === "inactive" ? "inactive" : "active",
    imageUrl: data.imageUrl?.trim() || null,
    internalNotes: data.internalNotes?.trim() || null
  });
};

export default CreateProductService;
