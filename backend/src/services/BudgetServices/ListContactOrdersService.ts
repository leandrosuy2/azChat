import TicketBudget from "../../models/TicketBudget";
import TicketBudgetOrder from "../../models/TicketBudgetOrder";

export type ContactOrderListRow = {
  id: number;
  orderNumber: string;
  total: number;
  budgetId: number | null;
  budgetNumber: string | null;
  ticketId: number | null;
  createdAt: Date;
  itemsCount: number;
};

const ListContactOrdersService = async (
  contactId: number,
  companyId: number
): Promise<ContactOrderListRow[]> => {
  const rows = await TicketBudgetOrder.findAll({
    where: { contactId, companyId },
    order: [["createdAt", "DESC"]],
    attributes: [
      "id",
      "orderNumber",
      "total",
      "budgetId",
      "ticketId",
      "createdAt",
      "items"
    ],
    include: [
      {
        model: TicketBudget,
        as: "budget",
        attributes: ["budgetNumber"],
        required: false
      }
    ]
  });

  return rows.map((r) => {
    const plain = r.get({ plain: true }) as {
      id: number;
      orderNumber: string;
      total: number;
      budgetId: number | null;
      ticketId: number | null;
      createdAt: Date;
      items: unknown[];
      budget?: { budgetNumber: string } | null;
    };
    const items = Array.isArray(plain.items) ? plain.items : [];
    return {
      id: plain.id,
      orderNumber: plain.orderNumber,
      total: Number(plain.total),
      budgetId: plain.budgetId,
      budgetNumber: plain.budget?.budgetNumber ?? null,
      ticketId: plain.ticketId,
      createdAt: plain.createdAt,
      itemsCount: items.length
    };
  });
};

export default ListContactOrdersService;
