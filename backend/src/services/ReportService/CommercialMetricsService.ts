import { QueryTypes } from "sequelize";
import sequelize from "../../database";

export interface CommercialMetricsParams {
  date_from?: string;
  date_to?: string;
  userId?: number;
}

export interface CommercialMetricsResult {
  summary: {
    totalRevenue: number;
    salesCount: number;
    avgTicket: number;
    attendancesCount: number;
    approvedBudgetsCount: number;
  };
  byUser: Array<{
    userId: number;
    userName: string;
    attendancesCount: number;
    salesCount: number;
    totalRevenue: number;
    avgTicket: number;
  }>;
  topProducts: Array<{
    productId: number | null;
    name: string;
    qty: number;
    revenue: number;
    avgTicket: number;
  }>;
  topCategories: Array<{
    category: string;
    qty: number;
    revenue: number;
    avgTicket: number;
  }>;
  revenueByDay: Array<{ date: string; revenue: number; salesCount: number }>;
}

const CommercialMetricsService = async (
  companyId: number,
  params: CommercialMetricsParams
): Promise<CommercialMetricsResult> => {
  const dateFrom = params.date_from || new Date().toISOString().slice(0, 10);
  const dateTo = params.date_to || dateFrom;
  const userFilter = params.userId ? `AND tb."userId" = ${Number(params.userId)}` : "";
  const userFilterOrder = params.userId
    ? `AND COALESCE(tb."userId", 0) = ${Number(params.userId)}`
    : "";

  const summaryRows = (await sequelize.query(
    `
    SELECT
      COALESCE(SUM(o.total), 0)::float AS "totalRevenue",
      COUNT(o.id)::int AS "salesCount",
      (
        SELECT COUNT(tt.id)::int
        FROM "TicketTraking" tt
        WHERE tt."companyId" = :companyId
          AND tt."startedAt" BETWEEN :dateFrom AND :dateTo
          ${params.userId ? `AND tt."userId" = ${Number(params.userId)}` : ""}
      ) AS "attendancesCount",
      (
        SELECT COUNT(b.id)::int
        FROM "TicketBudgets" b
        WHERE b."companyId" = :companyId
          AND b.status = 'approved'
          AND b."signedAt" BETWEEN :dateFrom AND :dateTo
          ${userFilter}
      ) AS "approvedBudgetsCount"
    FROM "TicketBudgetOrders" o
    LEFT JOIN "TicketBudgets" tb ON tb.id = o."budgetId"
    WHERE o."companyId" = :companyId
      AND o."createdAt" BETWEEN :dateFrom AND :dateTo
      ${userFilterOrder}
    `,
    {
      replacements: {
        companyId,
        dateFrom: `${dateFrom} 00:00:00`,
        dateTo: `${dateTo} 23:59:59`
      },
      type: QueryTypes.SELECT
    }
  )) as Array<{
    totalRevenue: number;
    salesCount: number;
    attendancesCount: number;
    approvedBudgetsCount: number;
  }>;

  const summaryRow = summaryRows[0] || {
    totalRevenue: 0,
    salesCount: 0,
    attendancesCount: 0,
    approvedBudgetsCount: 0
  };
  const totalRevenue = Number(summaryRow.totalRevenue) || 0;
  const salesCount = Number(summaryRow.salesCount) || 0;

  const byUser = (await sequelize.query(
    `
    WITH attendances AS (
      SELECT u.id AS "userId", u.name AS "userName", COUNT(tt.id)::int AS cnt
      FROM "Users" u
      LEFT JOIN "TicketTraking" tt ON tt."userId" = u.id
        AND tt."companyId" = :companyId
        AND tt."startedAt" BETWEEN :dateFrom AND :dateTo
      WHERE u."companyId" = :companyId
      GROUP BY u.id, u.name
    ),
    sales AS (
      SELECT
        COALESCE(tb."userId", 0) AS "userId",
        COALESCE(u.name, 'Sem vendedor') AS "userName",
        COUNT(o.id)::int AS "salesCount",
        COALESCE(SUM(o.total), 0)::float AS "totalRevenue"
      FROM "TicketBudgetOrders" o
      LEFT JOIN "TicketBudgets" tb ON tb.id = o."budgetId"
      LEFT JOIN "Users" u ON u.id = tb."userId"
      WHERE o."companyId" = :companyId
        AND o."createdAt" BETWEEN :dateFrom AND :dateTo
      GROUP BY COALESCE(tb."userId", 0), COALESCE(u.name, 'Sem vendedor')
    )
    SELECT
      COALESCE(a."userId", s."userId") AS "userId",
      COALESCE(NULLIF(a."userName", ''), s."userName") AS "userName",
      COALESCE(a.cnt, 0) AS "attendancesCount",
      COALESCE(s."salesCount", 0) AS "salesCount",
      COALESCE(s."totalRevenue", 0) AS "totalRevenue"
    FROM attendances a
    FULL OUTER JOIN sales s ON s."userId" = a."userId"
    WHERE COALESCE(a.cnt, 0) > 0 OR COALESCE(s."salesCount", 0) > 0
    ORDER BY "totalRevenue" DESC, "attendancesCount" DESC
    `,
    {
      replacements: {
        companyId,
        dateFrom: `${dateFrom} 00:00:00`,
        dateTo: `${dateTo} 23:59:59`
      },
      type: QueryTypes.SELECT
    }
  )) as Array<{
    userId: number;
    userName: string;
    attendancesCount: number;
    salesCount: number;
    totalRevenue: number;
  }>;

  const revenueByDay = (await sequelize.query(
    `
    SELECT
      to_char(o."createdAt", 'YYYY-MM-DD') AS date,
      COALESCE(SUM(o.total), 0)::float AS revenue,
      COUNT(o.id)::int AS "salesCount"
    FROM "TicketBudgetOrders" o
    WHERE o."companyId" = :companyId
      AND o."createdAt" BETWEEN :dateFrom AND :dateTo
    GROUP BY 1
    ORDER BY 1
    `,
    {
      replacements: {
        companyId,
        dateFrom: `${dateFrom} 00:00:00`,
        dateTo: `${dateTo} 23:59:59`
      },
      type: QueryTypes.SELECT
    }
  )) as Array<{ date: string; revenue: number; salesCount: number }>;

  const topProductsRows = (await sequelize.query(
    `
    SELECT
      NULLIF((item->>'productId')::int, 0) AS "productId",
      COALESCE(
        NULLIF(TRIM(p.name), ''),
        NULLIF(TRIM(item->>'description'), ''),
        'Sem descrição'
      ) AS name,
      COALESCE(SUM((item->>'qty')::numeric), 0)::float AS qty,
      COALESCE(SUM((item->>'total')::numeric), 0)::float AS revenue
    FROM "TicketBudgetOrders" o
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(o.items) = 'array' THEN o.items
        ELSE '[]'::jsonb
      END
    ) AS item
    LEFT JOIN "Products" p
      ON p.id = NULLIF((item->>'productId')::int, 0)
      AND p."companyId" = :companyId
    WHERE o."companyId" = :companyId
      AND o."createdAt" BETWEEN :dateFrom AND :dateTo
    GROUP BY 1, 2
    ORDER BY revenue DESC, qty DESC
    LIMIT 15
    `,
    {
      replacements: {
        companyId,
        dateFrom: `${dateFrom} 00:00:00`,
        dateTo: `${dateTo} 23:59:59`
      },
      type: QueryTypes.SELECT
    }
  )) as Array<{
    productId: number | null;
    name: string;
    qty: number;
    revenue: number;
  }>;

  const topCategoriesRows = (await sequelize.query(
    `
    SELECT
      COALESCE(
        NULLIF(TRIM(item->>'category'), ''),
        NULLIF(TRIM(p.category), ''),
        CASE
          WHEN pc.name IS NOT NULL THEN
            pc.name || COALESCE(' / ' || NULLIF(sc.name, ''), '')
          ELSE NULL
        END,
        'Sem categoria'
      ) AS category,
      COALESCE(SUM((item->>'qty')::numeric), 0)::float AS qty,
      COALESCE(SUM((item->>'total')::numeric), 0)::float AS revenue
    FROM "TicketBudgetOrders" o
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(o.items) = 'array' THEN o.items
        ELSE '[]'::jsonb
      END
    ) AS item
    LEFT JOIN "Products" p
      ON p.id = NULLIF((item->>'productId')::int, 0)
      AND p."companyId" = :companyId
    LEFT JOIN "ProductCategories" pc ON pc.id = p."categoryId"
    LEFT JOIN "ProductCategories" sc ON sc.id = p."subcategoryId"
    WHERE o."companyId" = :companyId
      AND o."createdAt" BETWEEN :dateFrom AND :dateTo
    GROUP BY 1
    ORDER BY revenue DESC, qty DESC
    LIMIT 15
    `,
    {
      replacements: {
        companyId,
        dateFrom: `${dateFrom} 00:00:00`,
        dateTo: `${dateTo} 23:59:59`
      },
      type: QueryTypes.SELECT
    }
  )) as Array<{ category: string; qty: number; revenue: number }>;

  const topProducts = topProductsRows.map((r) => {
    const qty = Number(r.qty) || 0;
    const revenue = Number(r.revenue) || 0;
    return {
      productId: r.productId != null ? Number(r.productId) : null,
      name: r.name,
      qty,
      revenue,
      avgTicket: qty > 0 ? revenue / qty : 0
    };
  });

  const topCategories = topCategoriesRows.map((r) => {
    const qty = Number(r.qty) || 0;
    const revenue = Number(r.revenue) || 0;
    return {
      category: r.category,
      qty,
      revenue,
      avgTicket: qty > 0 ? revenue / qty : 0
    };
  });

  return {
    summary: {
      totalRevenue,
      salesCount,
      avgTicket: salesCount > 0 ? totalRevenue / salesCount : 0,
      attendancesCount: Number(summaryRow.attendancesCount) || 0,
      approvedBudgetsCount: Number(summaryRow.approvedBudgetsCount) || 0
    },
    byUser: byUser.map((r) => ({
      userId: Number(r.userId),
      userName: r.userName,
      attendancesCount: Number(r.attendancesCount) || 0,
      salesCount: Number(r.salesCount) || 0,
      totalRevenue: Number(r.totalRevenue) || 0,
      avgTicket:
        Number(r.salesCount) > 0
          ? Number(r.totalRevenue) / Number(r.salesCount)
          : 0
    })),
    topProducts,
    topCategories,
    revenueByDay: revenueByDay.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue) || 0,
      salesCount: Number(r.salesCount) || 0
    }))
  };
};

export default CommercialMetricsService;
