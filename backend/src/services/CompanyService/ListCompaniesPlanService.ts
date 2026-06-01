import { fn, col, Op, where as sqlWhere } from "sequelize";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import User from "../../models/User";

interface ListCompaniesPlanParams {
  searchParam?: string;
  pageNumber?: string | number;
  pageSize?: number;
}

interface ListCompaniesPlanResponse {
  companies: any[];
  count: number;
  hasMore: boolean;
}

const ListCompaniesPlanService = async (
  params: ListCompaniesPlanParams = {}
): Promise<ListCompaniesPlanResponse> => {
  const searchParam = String(params.searchParam || "").trim();
  const pageNumber = Math.max(1, parseInt(String(params.pageNumber || 1), 10) || 1);
  const pageSize = Math.max(5, Math.min(200, params.pageSize || 20));
  const offset = (pageNumber - 1) * pageSize;

  const where: any = {};
  if (searchParam) {
    const like = `%${searchParam.toLowerCase()}%`;
    where[Op.or as any] = [
      sqlWhere(fn("LOWER", col("Company.name")), { [Op.like]: like } as any),
      sqlWhere(fn("LOWER", col("Company.email")), { [Op.like]: like } as any),
      sqlWhere(fn("LOWER", col("Company.document")), { [Op.like]: like } as any)
    ];
  }

  const { rows: companies, count } = await Company.findAndCountAll({
    where,
    attributes: [
      "id",
      "name",
      "email",
      "status",
      "dueDate",
      "createdAt",
      "phone",
      "document",
      "lastLogin",
      "folderSize",
      "numberFileFolder",
      "updatedAtFolder",
      "address",
      "logo",
      "recurrence",
      "planId"
    ],
    order: [["name", "ASC"]],
    limit: pageSize,
    offset,
    distinct: true,
    include: [
      {
        model: Plan,
        as: "plan",
        attributes: [
          "id",
          "name",
          "users",
          "connections",
          "queues",
          "amount",
          "useWhatsapp",
          "useFacebook",
          "useInstagram",
          "useCampaigns",
          "useSchedules",
          "useInternalChat",
          "useExternalApi",
          "useKanban",
          "useOpenAi",
          "useIntegrations"
        ]
      }
    ]
  });

  let userCountMap: Record<number, number> = {};
  try {
    const companyIds = companies.map((c: any) => c.id);
    if (companyIds.length > 0) {
      const userCounts: any[] = await User.findAll({
        attributes: ["companyId", [fn("COUNT", col("id")), "total"]],
        where: { companyId: { [Op.in]: companyIds } },
        group: ["companyId"],
        raw: true
      });
      userCountMap = userCounts.reduce(
        (acc: Record<number, number>, row: any) => {
          const cid = Number(row.companyId);
          if (Number.isFinite(cid)) {
            acc[cid] = Number(row.total) || 0;
          }
          return acc;
        },
        {}
      );
    }
  } catch (_err) {
    userCountMap = {};
  }

  const items = companies.map((company: any) => {
    const plain =
      typeof company.toJSON === "function" ? company.toJSON() : company;
    return {
      ...plain,
      userCount: userCountMap[plain.id] || 0
    };
  });

  const totalCount = typeof count === "number" ? count : items.length;
  const hasMore = totalCount > offset + items.length;

  return { companies: items, count: totalCount, hasMore };
};

export default ListCompaniesPlanService;
