import { Op } from "sequelize";
import Product from "../../models/Product";

interface Request {
  companyId: number;
  searchParam?: string;
  status?: string;
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
  pageNumber = "1"
}: Request): Promise<Response> => {
  const limit = 50;
  const page = Number(pageNumber) > 0 ? Number(pageNumber) : 1;
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = { companyId };
  if (status && status !== "all") {
    where.status = status;
  }
  if (searchParam.trim()) {
    Object.assign(where, {
      [Op.or]: [
        { name: { [Op.iLike]: `%${searchParam}%` } },
        { code: { [Op.iLike]: `%${searchParam}%` } },
        { category: { [Op.iLike]: `%${searchParam}%` } }
      ]
    });
  }

  const { count, rows } = await Product.findAndCountAll({
    where,
    limit,
    offset,
    order: [["name", "ASC"]]
  });

  return {
    products: rows,
    count,
    hasMore: count > offset + rows.length
  };
};

export default ListProductsService;
