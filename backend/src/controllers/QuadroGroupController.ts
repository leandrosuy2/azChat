import { Request, Response } from "express";
import ListQuadroGroupsService from "../services/QuadroServices/ListQuadroGroupsService";
import CreateQuadroGroupService from "../services/QuadroServices/CreateQuadroGroupService";
import UpdateQuadroGroupService from "../services/QuadroServices/UpdateQuadroGroupService";
import DeleteQuadroGroupService from "../services/QuadroServices/DeleteQuadroGroupService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const groups = await ListQuadroGroupsService(companyId);
  return res.status(200).json({
    groups: groups.map((g) => ({ id: g.id, name: g.name }))
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name } = req.body;
  const group = await CreateQuadroGroupService({ name, companyId });
  return res.status(201).json(group);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { name } = req.body;
  const group = await UpdateQuadroGroupService({ id: parseInt(id, 10), name, companyId });
  return res.status(200).json(group);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  await DeleteQuadroGroupService({ id: parseInt(id, 10), companyId });
  return res.status(204).send();
};
