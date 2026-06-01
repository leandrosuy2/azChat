import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import Plan from "../../models/Plan";

const ShowPlanCompanyService = async (id: string | number): Promise<Company> => {
  const company = await Company.findOne({
    where: { id },
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
      "address",
      "logo",
      "planId",
      "recurrence"
    ],
    order: [["name", "ASC"]],
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

  if (!company) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  return company;
};

export default ShowPlanCompanyService;
