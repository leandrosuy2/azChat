import moment from "moment";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import CompanyLifecycleEvent from "../../models/CompanyLifecycleEvent";
import Invoices from "../../models/Invoices";
import Plan from "../../models/Plan";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import LogCompanyLifecycleEventService from "./LogCompanyLifecycleEventService";

const isPaidStatus = (s: string): boolean =>
  ["paid", "pago", "approved", "aprovado", "confirmado"].includes(
    String(s || "").toLowerCase()
  );

const backfillIfEmpty = async (company: Company): Promise<void> => {
  const count = await CompanyLifecycleEvent.count({
    where: { companyId: company.id }
  });
  if (count > 0) return;

  await LogCompanyLifecycleEventService({
    companyId: company.id,
    eventType: "cadastro_realizado",
    title: "Cadastro realizado",
    description: `Empresa ${company.name} criada na plataforma.`,
    metadata: { source: "backfill", createdAt: company.createdAt }
  });

  if (company.lastLogin) {
    await LogCompanyLifecycleEventService({
      companyId: company.id,
      eventType: "primeiro_acesso",
      title: "Último acesso registrado",
      description: `Último login em ${moment(company.lastLogin).format("DD/MM/YYYY HH:mm")}.`,
      metadata: { source: "backfill" }
    });
  }

  const invoices = await Invoices.findAll({
    where: { companyId: company.id },
    order: [["createdAt", "ASC"]]
  });

  for (const inv of invoices) {
    const paid = isPaidStatus(inv.status);
    await LogCompanyLifecycleEventService({
      companyId: company.id,
      eventType: paid ? "pagamento_confirmado" : "vencimento",
      title: paid ? `Pagamento: ${inv.detail || inv.id}` : `Fatura: ${inv.detail || inv.id}`,
      description: `Valor R$ ${Number(inv.value).toFixed(2)} · venc. ${inv.dueDate || "—"} · status ${inv.status}`,
      metadata: {
        source: "backfill",
        invoiceId: inv.id,
        value: inv.value,
        dueDate: inv.dueDate
      },
      newStatus: inv.status
    });
  }
};

const GetCompanyLifecycleOverviewService = async (
  companyId: number
): Promise<Record<string, unknown>> => {
  const company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan", required: false }]
  });

  if (!company) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  await backfillIfEmpty(company);

  const [userCount, whatsappCount, invoices, events] = await Promise.all([
    User.count({ where: { companyId } }),
    Whatsapp.count({ where: { companyId } }),
    Invoices.findAll({
      where: { companyId },
      order: [["dueDate", "DESC"]],
      limit: 24
    }),
    CompanyLifecycleEvent.findAll({
      where: { companyId },
      order: [["createdAt", "DESC"]],
      limit: 200,
      include: [{ model: User, attributes: ["id", "name", "email"], required: false }]
    })
  ]);

  const paidInvoices = invoices.filter((i) => isPaidStatus(i.status));
  const pendingInvoices = invoices.filter(
    (i) => !isPaidStatus(i.status) && String(i.status).toLowerCase() !== "cancelled"
  );
  const totalPaid = paidInvoices.reduce((acc, i) => acc + Number(i.value || 0), 0);

  const dueMoment = company.dueDate
    ? moment(company.dueDate, ["YYYY-MM-DD", "DD/MM/YYYY"], true)
    : null;
  const daysToDue = dueMoment?.isValid() ? dueMoment.diff(moment(), "days") : null;
  const isOverdue = daysToDue != null && daysToDue < 0;
  const financialSituation = isOverdue
    ? "inadimplente"
    : pendingInvoices.length > 0
      ? "pendente"
      : "em_dia";

  const daysRegistered = moment().diff(moment(company.createdAt), "days");

  return {
    company: {
      id: company.id,
      name: company.name,
      email: company.email,
      phone: company.phone,
      document: company.document,
      status: company.status,
      dueDate: company.dueDate,
      recurrence: company.recurrence,
      paymentMethod: company.paymentMethod,
      createdAt: company.createdAt,
      lastLogin: company.lastLogin,
      plan: company.plan
        ? { id: company.plan.id, name: company.plan.name, amount: company.plan.amount }
        : null,
      daysRegistered,
      daysToDue,
      isOverdue
    },
    financial: {
      totalPaid,
      paidCount: paidInvoices.length,
      pendingCount: pendingInvoices.length,
      situation: financialSituation,
      recentInvoices: invoices.map((i) => ({
        id: i.id,
        detail: i.detail,
        status: i.status,
        value: Number(i.value),
        dueDate: i.dueDate,
        createdAt: i.createdAt
      }))
    },
    operational: {
      userCount,
      whatsappConnections: whatsappCount,
      accountActive: company.status !== false,
      lastLogin: company.lastLogin,
      situation: company.status !== false ? "operacional" : "inativa"
    },
    timeline: events.map((e) => {
      const plain = e.get({ plain: true }) as {
        id: number;
        eventType: string;
        title: string;
        description: string | null;
        previousStatus: string | null;
        newStatus: string | null;
        metadata: Record<string, unknown> | null;
        createdAt: Date;
        user?: { id: number; name: string; email: string };
      };
      return {
        id: plain.id,
        eventType: plain.eventType,
        title: plain.title,
        description: plain.description,
        previousStatus: plain.previousStatus,
        newStatus: plain.newStatus,
        metadata: plain.metadata,
        createdAt: plain.createdAt,
        user: plain.user
          ? { id: plain.user.id, name: plain.user.name, email: plain.user.email }
          : null
      };
    })
  };
};

export default GetCompanyLifecycleOverviewService;
