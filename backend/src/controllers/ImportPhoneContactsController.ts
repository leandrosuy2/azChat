import { Request, Response } from "express";
import ImportContactsService from "../services/WbotServices/ImportContactsService";
import AppError from "../errors/AppError";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  if (companyId == null || companyId === undefined) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 400);
  }

  const whatsappIdRaw = (req.body as { whatsappId?: number })?.whatsappId;
  const whatsappId =
    whatsappIdRaw != null && Number.isFinite(Number(whatsappIdRaw))
      ? Number(whatsappIdRaw)
      : undefined;

  await ImportContactsService(companyId, whatsappId);

  return res.status(200).json({ message: "contacts imported" });
};
