import { Request, Response } from "express";
import ListQuadroStatusesService from "../services/QuadroServices/ListQuadroStatusesService";
import UpdateQuadroStatusesService from "../services/QuadroServices/UpdateQuadroStatusesService";
import { assertKanbanPermission } from "../helpers/checkKanbanPermission";

export const index = async (req: Request, res: Response): Promise<Response> => {
  assertKanbanPermission(req.user, "view");
  const { companyId } = req.user;
  const raw = req.query.quadroGroupId;
  if (raw == null || raw === "") {
    return res.status(400).json({ error: "quadroGroupId é obrigatório" });
  }
  const gid = Number(raw);
  if (Number.isNaN(gid)) {
    return res.status(400).json({ error: "quadroGroupId inválido" });
  }
  const statuses = await ListQuadroStatusesService(companyId, gid);
  return res.status(200).json({ statuses });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  assertKanbanPermission(req.user, "edit");
  const { companyId } = req.user;
  const { statuses, quadroGroupId: qgBody } = req.body;
  if (qgBody == null || qgBody === "") {
    return res.status(400).json({ error: "quadroGroupId é obrigatório" });
  }
  const quadroGroupId = Number(qgBody);
  if (Number.isNaN(quadroGroupId)) {
    return res.status(400).json({ error: "quadroGroupId inválido" });
  }
  await UpdateQuadroStatusesService({ statuses, companyId, quadroGroupId });
  return res.status(200).json({ message: "Status atualizados." });
};
