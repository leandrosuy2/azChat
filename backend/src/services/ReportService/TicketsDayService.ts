import sequelize from "../../database/index";
import { QueryTypes } from "sequelize";

interface Return {
  data: {};
  count: number;
}

interface Request {
  initialDate: string;
  finalDate: string;
  companyId: number;
  userId?: string | number;
  profile?: string;
}

interface DataReturn {
  total: number;
  data?: number;
  horario?: string;
}

export const TicketsDayService = async ({ initialDate, finalDate, companyId, userId, profile }: Request): Promise<Return> => {

  let sql = '';
  let count = 0;
  const isAdmin = profile === "admin";
  const ticketsWhere = isAdmin || !userId
    ? ""
    : ` and (
        tick."userId" = :userId
        or (
          tick."status" = 'pending'
          and tick."queueId" in (
            select uq."queueId"
            from "UserQueues" uq
            where uq."userId" = :userId
          )
        )
      )`;
  const replacements = {
    companyId,
    userId,
    initialDate,
    finalDate,
    initialDateTime: `${initialDate} 00:00:00`,
    finalDateTime: `${finalDate} 23:59:59`
  };

  if (initialDate && initialDate.trim() === finalDate && finalDate.trim()) {
    sql = `
    SELECT
      COUNT(*) AS total,
      extract(hour from tick."createdAt") AS horario
      --to_char(DATE(tick."createdAt"), 'dd-mm-YYYY') as horario
    FROM
      "Tickets" tick
    WHERE
      tick."companyId" = :companyId
      and tick."createdAt" >= :initialDateTime
      AND tick."createdAt" <= :finalDateTime
      ${ticketsWhere}
    GROUP BY
      extract(hour from tick."createdAt")
      --to_char(DATE(tick."createdAt"), 'dd-mm-YYYY')
    ORDER BY
      horario asc;
    `
  } else {
    sql = `
    SELECT
    COUNT(*) AS total,
    to_char(DATE(tick."createdAt"), 'dd/mm/YYYY') as data
  FROM
    "Tickets" tick
  WHERE
    tick."companyId" = :companyId
    and DATE(tick."createdAt") >= :initialDate
    AND DATE(tick."createdAt") <= :finalDate
    ${ticketsWhere}
  GROUP BY
    to_char(DATE(tick."createdAt"), 'dd/mm/YYYY')
  ORDER BY
    data asc;
  `
  }

  const data: DataReturn[] = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

  data.forEach((register) => {
    count += Number(register.total);
  })

  return { data, count };

}
