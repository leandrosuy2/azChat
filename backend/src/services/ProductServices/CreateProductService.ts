import AppError from "../../errors/AppError";
import Product from "../../models/Product";

interface Request {
  companyId: number;
  name: string;
  description?: string;
  category?: string;
  code?: string;
  price?: number;
  status?: string;
}

const CreateProductService = async ({
  companyId,
  name,
  description,
  category,
  code,
  price,
  status
}: Request): Promise<Product> => {
  const nameTrim = String(name || "").trim();
  if (!nameTrim) {
    throw new AppError("ERR_PRODUCT_NAME_REQUIRED", 400);
  }

  return Product.create({
    companyId,
    name: nameTrim,
    description: description?.trim() || null,
    category: category?.trim() || null,
    code: code?.trim() || null,
    price: Number(price) || 0,
    status: status === "inactive" ? "inactive" : "active"
  });
};

export default CreateProductService;
