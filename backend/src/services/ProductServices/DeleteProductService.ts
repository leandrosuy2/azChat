import AppError from "../../errors/AppError";
import Product from "../../models/Product";

const DeleteProductService = async (
  id: number,
  companyId: number
): Promise<void> => {
  const product = await Product.findOne({ where: { id, companyId } });
  if (!product) {
    throw new AppError("ERR_PRODUCT_NOT_FOUND", 404);
  }
  await product.destroy();
};

export default DeleteProductService;
