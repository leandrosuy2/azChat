import { Op } from "sequelize";
import ProductCategory from "../../models/ProductCategory";

interface Request {
  companyId: number;
  parentId?: number | null;
}

const ListProductCategoriesService = async ({
  companyId,
  parentId
}: Request): Promise<ProductCategory[]> => {
  const where: Record<string, unknown> = { companyId };
  if (parentId === null || parentId === 0) {
    where.parentId = { [Op.is]: null };
  } else if (parentId != null) {
    where.parentId = parentId;
  }

  return ProductCategory.findAll({
    where,
    order: [["name", "ASC"]],
    include: [
      {
        model: ProductCategory,
        as: "children",
        required: false,
        separate: true,
        order: [["name", "ASC"]]
      }
    ]
  });
};

export default ListProductCategoriesService;
