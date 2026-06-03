import { Request, Response } from "express";
import SearchGlobalService from "../services/GlobalSearchService/SearchGlobalService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { q } = req.query;
  const { companyId, id: userId, profile, super: superUser } = req.user;

  const results = await SearchGlobalService({
    query: String(q || ""),
    companyId,
    userId: Number(userId),
    profile,
    superUser
  });

  return res.json({ results });
};
