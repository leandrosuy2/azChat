import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import Setting from "../../models/Setting";
import User from "../../models/User";
import Plan from "../../models/Plan";
import LogCompanyLifecycleEventService from "./LogCompanyLifecycleEventService";

interface CompanyData {
  name: string;
  id?: number | string;
  phone?: string;
  email?: string;
  status?: boolean;
  planId?: number;
  campaignsEnabled?: boolean;
  dueDate?: string;
  recurrence?: string;
  document?: string;
  paymentMethod?: string;
  password?: string;
  address?: string;
  logo?: string;
}

const UpdateCompanyService = async (
  companyData: CompanyData
): Promise<Company> => {

  const company = await Company.findByPk(companyData.id);
  const prevStatus = company?.status;
  const prevPlanId = company?.planId;
  const {
    name,
    phone,
    email,
    status,
    planId,
    campaignsEnabled,
    dueDate,
    recurrence,
    document,
    paymentMethod,
    password,
    address,
    logo
  } = companyData;

  if (!company) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  const existUser = await User.findOne({
    where: {
      companyId: company.id,
      email: email
    }
  });

  if (existUser && existUser.email !== company.email) {
    throw new AppError("Usuário já existe com esse e-mail!", 404)
  }

  const user = await User.findOne({
    where: {
      companyId: company.id,
      email: company.email
    }
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404)
  }
  
  await user.update({ email, password });


  await company.update({
    name,
    phone,
    email,
    status,
    planId,
    dueDate,
    recurrence,
    document,
    paymentMethod,
    ...(address !== undefined ? { address } : {}),
    ...(logo !== undefined ? { logo } : {})
  });

  if (companyData.campaignsEnabled !== undefined) {
    const [setting, created] = await Setting.findOrCreate({
      where: {
        companyId: company.id,
        key: "campaignsEnabled"
      },
      defaults: {
        companyId: company.id,
        key: "campaignsEnabled",
        value: `${campaignsEnabled}`
      }
    });
    if (!created) {
      await setting.update({ value: `${campaignsEnabled}` });
    }
  }

  try {
    if (planId != null && Number(planId) !== Number(prevPlanId)) {
      const plan = await Plan.findByPk(planId, { attributes: ["name"] });
      await LogCompanyLifecycleEventService({
        companyId: company.id,
        eventType: "alteracao_plano",
        title: "Plano alterado",
        description: plan?.name ? `Novo plano: ${plan.name}` : undefined,
        previousStatus: prevPlanId != null ? String(prevPlanId) : null,
        newStatus: String(planId)
      });
    }
    if (status !== undefined && Boolean(status) !== Boolean(prevStatus)) {
      await LogCompanyLifecycleEventService({
        companyId: company.id,
        eventType: Boolean(status) ? "reativacao" : "bloqueio",
        title: Boolean(status) ? "Conta reativada" : "Conta bloqueada",
        previousStatus: prevStatus ? "ativa" : "inativa",
        newStatus: status ? "ativa" : "inativa"
      });
    } else if (status !== undefined) {
      await LogCompanyLifecycleEventService({
        companyId: company.id,
        eventType: "alteracao_status",
        title: "Status atualizado",
        previousStatus: prevStatus ? "ativa" : "inativa",
        newStatus: status ? "ativa" : "inativa"
      });
    }
  } catch {
    /* noop */
  }

  return company;
};

export default UpdateCompanyService;
