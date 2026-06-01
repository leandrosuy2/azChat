import AppError from "../../errors/AppError";
import Product from "../../models/Product";

interface Request {
  id: number;
  companyId: number;
  name?: string;
  description?: string;
  category?: string;
  code?: string;
  price?: number;
  status?: string;
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
  if (data.category !== undefined) {
    product.category = data.category?.trim() || null;
  }
  if (data.code !== undefined) {
    product.code = data.code?.trim() || null;
  }
  if (data.price != null) {
    product.price = Number(data.price) || 0;
  }
  if (data.status != null) {
    product.status = data.status === "inactive" ? "inactive" : "active";
  }

  await product.save();
  return product;
};

export default UpdateProductService;
