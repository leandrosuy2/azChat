import sequelize from "../../database/index";
import { QueryTypes } from "sequelize";

interface Return {
  data: {};
}

interface Request {
  initialDate: string;
  finalDate: string;
  companyId: number;
  userId?: string | number;
  profile?: string;
}

interface DataReturn {
  quantidade: number;
  data?: number;
  nome?: string;
}

interface dataUser {
  name: string;
}

export const TicketsAttendance = async ({ initialDate, finalDate, companyId, userId, profile }: Request): Promise<Return> => { 
  const isAdmin = profile === "admin";
  const usersWhere = isAdmin || !userId ? "" : ` and u.id = :userId`;
  const ticketsWhere = isAdmin || !userId
    ? ""
    : ` and (
        tt."userId" = :userId
        or (
          tt."status" = 'pending'
          and tt."queueId" in (
            select uq."queueId"
            from "UserQueues" uq
            where uq."userId" = :userId
          )
        )
      )`;
  const replacements = {
    companyId,
    userId,
    initialDate: `${initialDate} 00:00:00`,
    finalDate: `${finalDate} 23:59:59`
  };

  const sqlUsers = `select u.name from "Users" u where u."companyId" = :companyId ${usersWhere}`

  const users: dataUser[] = await sequelize.query(sqlUsers, { replacements, type: QueryTypes.SELECT });

  const sql = `
  select
    COUNT(*) AS quantidade,
    u.name AS nome
  from
    "Tickets" tt
    left join "Users" u on u.id = tt."userId"
  where
    tt."companyId" = :companyId
    and tt."userId" is not null
    and tt."createdAt" >= :initialDate
    and tt."createdAt" <= :finalDate
    ${ticketsWhere}
  group by
    nome
  ORDER BY
    nome asc`

  const data: DataReturn[] = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

  users.map(user => {
    let indexCreated = data.findIndex((item) => item.nome === user.name);

    if (indexCreated === -1) {
      data.push({ quantidade: 0, nome: user.name })
    }

  })

  return { data };
}
