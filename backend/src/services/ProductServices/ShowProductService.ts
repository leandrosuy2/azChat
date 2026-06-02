import AppError from "../../errors/AppError";
import Product from "../../models/Product";
import ProductCategory from "../../models/ProductCategory";

const ShowProductService = async (
  id: number,
  companyId: number
): Promise<Product> => {
  const product = await Product.findOne({
    where: { id, companyId },
    include: [
      { model: ProductCategory, as: "productCategory", required: false },
      { model: ProductCategory, as: "productSubcategory", required: false }
    ]
  });
  if (!product) {
    throw new AppError("ERR_PRODUCT_NOT_FOUND", 404);
  }
  return product;
};

export default ShowProductService;
