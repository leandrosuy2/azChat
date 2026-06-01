import Contact from "../../models/Contact";
import TicketBudget from "../../models/TicketBudget";
import TicketBudgetOrder from "../../models/TicketBudgetOrder";
import AppError from "../../errors/AppError";

export interface ContactFinancialSummary {
  contactId: number;
  totalRevenue: number;
  salesCount: number;
  approvedBudgetsCount: number;
  pendingBudgetsCount: number;
  orders: Array<{
    id: number;
    orderNumber: string;
    total: number;
    createdAt: Date;
    budgetNumber: string | null;
  }>;
  budgets: Array<{
    id: number;
    budgetNumber: string;
    status: string;
    totalValue: number;
    createdAt: Date;
  }>;
}

const ContactFinancialService = async (
  contactId: number,
  companyId: number
): Promise<ContactFinancialSummary> => {
  const contact = await Contact.findOne({ where: { id: contactId, companyId } });
  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  const orders = await TicketBudgetOrder.findAll({
    where: { contactId, companyId },
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: TicketBudget,
        as: "budget",
        attributes: ["budgetNumber"],
        required: false
      }
    ]
  });

  const budgets = await TicketBudget.findAll({
    where: { contactId, companyId },
    order: [["createdAt", "DESC"]],
    attributes: ["id", "budgetNumber", "status", "payload", "createdAt"]
  });

  const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total), 0);

  return {
    contactId,
    totalRevenue,
    salesCount: orders.length,
    approvedBudgetsCount: budgets.filter((b) => b.status === "approved").length,
    pendingBudgetsCount: budgets.filter((b) => b.status === "pending").length,
    orders: orders.map((o) => {
      const plain = o.get({ plain: true }) as {
        id: number;
        orderNumber: string;
        total: number;
        createdAt: Date;
        budget?: { budgetNumber: string };
      };
      return {
        id: plain.id,
        orderNumber: plain.orderNumber,
        total: Number(plain.total),
        createdAt: plain.createdAt,
        budgetNumber: plain.budget?.budgetNumber ?? null
      };
    }),
    budgets: budgets.map((b) => {
      const items = (b.payload as { items?: { total?: number }[] })?.items || [];
      const totalValue = items.reduce(
        (acc, it) => acc + (Number(it.total) || 0),
        0
      );
      return {
        id: b.id,
        budgetNumber: b.budgetNumber,
        status: b.status,
        totalValue,
        createdAt: b.createdAt
      };
    })
  };
};

export default ContactFinancialService;
