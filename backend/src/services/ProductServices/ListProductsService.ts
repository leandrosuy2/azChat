import { Op } from "sequelize";
import Product from "../../models/Product";
import ProductCategory from "../../models/ProductCategory";

interface Request {
  companyId: number;
  searchParam?: string;
  status?: string;
  categoryId?: number;
  pageNumber?: string | number;
}

interface Response {
  products: Product[];
  count: number;
  hasMore: boolean;
}

const ListProductsService = async ({
  companyId,
  searchParam = "",
  status,
  categoryId,
  pageNumber = "1"
}: Request): Promise<Response> => {
  const limit = 50;
  const page = Number(pageNumber) > 0 ? Number(pageNumber) : 1;
  const offset = (page - 1) * limit;

  const andConditions: Record<string, unknown>[] = [{ companyId }];
  if (status && status !== "all") {
    andConditions.push({ status });
  }
  if (categoryId) {
    andConditions.push({
      [Op.or]: [{ categoryId }, { subcategoryId: categoryId }]
    });
  }
  if (searchParam.trim()) {
    andConditions.push({
      [Op.or]: [
        { name: { [Op.iLike]: `%${searchParam}%` } },
        { code: { [Op.iLike]: `%${searchParam}%` } },
        { category: { [Op.iLike]: `%${searchParam}%` } }
      ]
    });
  }

  const { count, rows } = await Product.findAndCountAll({
    where: { [Op.and]: andConditions },
    limit,
    offset,
    order: [["name", "ASC"]],
    include: [
      { model: ProductCategory, as: "productCategory", required: false },
      { model: ProductCategory, as: "productSubcategory", required: false }
    ]
  });

  return {
    products: rows,
    count,
    hasMore: count > offset + rows.length
  };
};

export default ListProductsService;
