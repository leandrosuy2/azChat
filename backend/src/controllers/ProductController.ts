import { Request, Response } from "express";
import CreateProductService from "../services/ProductServices/CreateProductService";
import ListProductsService from "../services/ProductServices/ListProductsService";
import UpdateProductService from "../services/ProductServices/UpdateProductService";
import DeleteProductService from "../services/ProductServices/DeleteProductService";
import Product from "../models/Product";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, status, pageNumber } = req.query;
  const data = await ListProductsService({
    companyId,
    searchParam: String(searchParam || ""),
    status: status ? String(status) : undefined,
    pageNumber: pageNumber as string | number | undefined
  });
  return res.json(data);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const product = await CreateProductService({ companyId, ...req.body });
  return res.status(201).json(product);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  const product = await UpdateProductService({ id, companyId, ...req.body });
  return res.json(product);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  await DeleteProductService(id, companyId);
  return res.status(200).json({ ok: true });
};

export const listActive = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const products = await Product.findAll({
    where: { companyId, status: "active" },
    order: [["name", "ASC"]],
    attributes: ["id", "name", "code", "category", "price", "description"]
  });
  return res.json(products);
};
