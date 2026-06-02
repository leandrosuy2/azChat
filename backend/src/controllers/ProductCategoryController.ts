import { Request, Response } from "express";
import ListProductCategoriesService from "../services/ProductCategoryServices/ListProductCategoriesService";
import CreateProductCategoryService from "../services/ProductCategoryServices/CreateProductCategoryService";
import UpdateProductCategoryService from "../services/ProductCategoryServices/UpdateProductCategoryService";
import DeleteProductCategoryService from "../services/ProductCategoryServices/DeleteProductCategoryService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const parentId =
    req.query.parentId === "root"
      ? null
      : req.query.parentId != null
        ? Number(req.query.parentId)
        : undefined;
  const categories = await ListProductCategoriesService({ companyId, parentId });
  return res.json(categories);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const category = await CreateProductCategoryService({
    companyId,
    name: req.body.name,
    parentId: req.body.parentId ?? null
  });
  return res.status(201).json(category);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  const category = await UpdateProductCategoryService({
    id,
    companyId,
    name: req.body.name
  });
  return res.json(category);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  await DeleteProductCategoryService(id, companyId);
  return res.status(200).json({ ok: true });
};
