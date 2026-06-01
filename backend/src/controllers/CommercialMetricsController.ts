import { Request, Response } from "express";
import CommercialMetricsService from "../services/ReportService/CommercialMetricsService";
import ContactFinancialService from "../services/ReportService/ContactFinancialService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { date_from, date_to, userId } = req.query;
  const data = await CommercialMetricsService(companyId, {
    date_from: date_from ? String(date_from) : undefined,
    date_to: date_to ? String(date_to) : undefined,
    userId: userId ? Number(userId) : undefined
  });
  return res.json(data);
};

export const contactFinancial = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const contactId = parseInt(req.params.contactId, 10);
  const data = await ContactFinancialService(contactId, companyId);
  return res.json(data);
};
