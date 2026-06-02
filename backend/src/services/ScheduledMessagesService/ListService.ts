import { Op, Sequelize } from "sequelize";
import ScheduledMessages from "../../models/ScheduledMessages";

interface Request {
  searchParam?: string;
  companyId?: number;
  pageNumber?: string | number;
}

interface Response {
  schedules: ScheduledMessages[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  searchParam,
  pageNumber = "1",
  companyId
}: Request): Promise<Response> => {
  let whereCondition = {};
  const listAll = String(pageNumber) === "all";
  const limit = listAll ? 500 : 20;
  const offset = listAll ? 0 : limit * (+pageNumber - 1);

  if (!!searchParam) {
    whereCondition = {
      [Op.or]: [
        {
          "$Schedule.body$": Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("Schedule.message")),
            "LIKE",
            `%${searchParam.toLowerCase()}%`
          )
        },
        {
          "$Contact.name$": Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("contact.name")),
            "LIKE",
            `%${searchParam.toLowerCase()}%`
          )
        },
      ],
    }
  }

  whereCondition = {
    ...whereCondition,
    companyId: {
      [Op.eq]: companyId
    }
  }

  const { count, rows: schedules } = await ScheduledMessages.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = !listAll && count > offset + schedules.length;

  return {
    schedules,
    count,
    hasMore
  };
};

export default ListService;
