import * as Yup from "yup";
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import ApproveTicketBudgetService from "../services/BudgetServices/ApproveTicketBudgetService";
import GetTicketBudgetByTokenService from "../services/BudgetServices/GetTicketBudgetByTokenService";
import RejectTicketBudgetService from "../services/BudgetServices/RejectTicketBudgetService";

const clientIp = (req: Request): string => {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string") {
    return xf.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "";
};

export const showByToken = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { token } = req.params;
  if (!token || token.length < 16) {
    return res.status(400).json({ error: "Token inválido" });
  }
  const row = await GetTicketBudgetByTokenService(token);
  return res.json({
    budgetNumber: row.budgetNumber,
    status: row.status,
    validUntil: row.validUntil,
    payload: row.payload,
    signedAt: row.signedAt,
    signatureSignerName: row.signatureSignerName,
    signatureImage: row.signatureImage,
    rejectedAt: row.rejectedAt,
    createdAt: row.createdAt
  });
};

export const approve = async (req: Request, res: Response): Promise<Response> => {
  const { token } = req.params;
  if (!token || token.length < 16) {
    return res.status(400).json({ error: "Token inválido" });
  }

  const schema = Yup.object().shape({
    signerName: Yup.string().required().min(2),
    signatureImage: Yup.string().nullable(),
    acceptTerms: Yup.boolean().oneOf([true], "Aceite os termos")
  });

  try {
    await schema.validate(req.body);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const budget = await GetTicketBudgetByTokenService(token);
  const { signerName, signatureImage } = req.body as {
    signerName: string;
    signatureImage?: string | null;
  };

  const result = await ApproveTicketBudgetService({
    budget,
    signerName,
    signatureImage: signatureImage || null,
    signerIp: clientIp(req)
  });

  return res.json({
    ok: true,
    status: result.budget.status,
    orderNumber: result.order.orderNumber
  });
};

export const reject = async (req: Request, res: Response): Promise<Response> => {
  const { token } = req.params;
  if (!token || token.length < 16) {
    return res.status(400).json({ error: "Token inválido" });
  }
  const budget = await GetTicketBudgetByTokenService(token);
  const updated = await RejectTicketBudgetService(budget);
  return res.json({ ok: true, status: updated.status });
};
