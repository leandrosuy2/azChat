import { Op } from "sequelize";
import TicketBudget, { BudgetPayloadStored } from "../../models/TicketBudget";
import TicketBudgetOrder from "../../models/TicketBudgetOrder";
import {
  displayTitleFromPayload,
  normalizePayloadLikeCreate,
  sumBudgetItems
} from "./budgetPayloadUtils";

export type TicketBudgetListRow = {
  id: number;
  budgetNumber: string;
  status: string;
  validUntil: string | null;
  publicToken: string;
  createdAt: Date;
  signedAt: Date | null;
  rejectedAt: Date | null;
  displayTitle: string;
  totalValue: number;
  orderId: number | null;
  orderNumber: string | null;
  orderTotal: number | null;
  rejectionReason: string | null;
  ticketId?: number | null;
};

const ListTicketBudgetsService = async (
  ticketId: number,
  companyId: number
): Promise<TicketBudgetListRow[]> => {
  const rows = await TicketBudget.findAll({
    where: { ticketId, companyId },
    order: [["createdAt", "DESC"]],
    attributes: [
      "id",
      "budgetNumber",
      "status",
      "validUntil",
      "publicToken",
      "createdAt",
      "signedAt",
      "rejectedAt",
      "payload"
    ]
  });

  const budgetIds = rows.map((r) => r.id);
  const orders =
    budgetIds.length === 0
      ? []
      : await TicketBudgetOrder.findAll({
          where: { companyId, budgetId: { [Op.in]: budgetIds } },
          attributes: ["id", "budgetId", "orderNumber", "total"]
        });
  const orderByBudgetId = new Map<
    number,
    { id: number; orderNumber: string; total: number }
  >();
  for (const o of orders) {
    orderByBudgetId.set(o.budgetId, {
      id: o.id,
      orderNumber: o.orderNumber,
      total: Number(o.total)
    });
  }

  return rows.map((r) => {
    const row = r.get({ plain: true }) as {
      id: number;
      budgetNumber: string;
      status: string;
      validUntil: string | null;
      publicToken: string;
      createdAt: Date;
      signedAt: Date | null;
      rejectedAt: Date | null;
      payload: BudgetPayloadStored;
    };
    const norm = normalizePayloadLikeCreate(row.payload);
    const ord = orderByBudgetId.get(row.id);
    const rr = row.payload?.rejectionReason;
    return {
      id: row.id,
      budgetNumber: row.budgetNumber,
      status: row.status,
      validUntil: row.validUntil,
      publicToken: row.publicToken,
      createdAt: row.createdAt,
      signedAt: row.signedAt,
      rejectedAt: row.rejectedAt,
      displayTitle: displayTitleFromPayload(row.payload, row.budgetNumber),
      totalValue: sumBudgetItems(norm.items),
      orderId: ord?.id ?? null,
      orderNumber: ord?.orderNumber ?? null,
      orderTotal: ord != null ? ord.total : null,
      rejectionReason:
        typeof rr === "string" && rr.trim() ? rr.trim() : null
    };
  });
};

export default ListTicketBudgetsService;
