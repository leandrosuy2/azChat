import { Sequelize, Op, Filterable } from "sequelize";
import QuickMessage from "../../models/QuickMessage";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  companyId: number | string;
  userId?: number | string;
}

interface Response {
  records: QuickMessage[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId,
  userId
}: Request): Promise<Response> => {
  const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();

  const visibilityClause = {
    [Op.or]: [
      { visao: true },
      { userId }
    ]
  };

  const searchClause =
    sanitizedSearchParam.length > 0
      ? {
          [Op.or]: [
            Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("shortcode")),
              "LIKE",
              `%${sanitizedSearchParam}%`
            ),
            Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("message")),
              "LIKE",
              `%${sanitizedSearchParam}%`
            ),
            Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("category")),
              "LIKE",
              `%${sanitizedSearchParam}%`
            )
          ]
        }
      : null;

  const whereCondition: Filterable["where"] = {
    companyId,
    [Op.and]: searchClause ? [searchClause, visibilityClause] : [visibilityClause]
  };

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: records } = await QuickMessage.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [
      ["isFavorite", "DESC"],
      ["useCount", "DESC"],
      ["shortcode", "ASC"]
    ]
  });

  const hasMore = count > offset + records.length;

  return {
    records,
    count,
    hasMore
  };
};

export default ListService;
