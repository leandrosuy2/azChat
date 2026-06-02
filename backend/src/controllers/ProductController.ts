import { Request, Response } from "express";
import CreateProductService from "../services/ProductServices/CreateProductService";
import ListProductsService from "../services/ProductServices/ListProductsService";
import UpdateProductService from "../services/ProductServices/UpdateProductService";
import DeleteProductService from "../services/ProductServices/DeleteProductService";
import ShowProductService from "../services/ProductServices/ShowProductService";
import Product from "../models/Product";
import ProductCategory from "../models/ProductCategory";
import { DEFAULT_PRODUCT_UNITS } from "../constants/productUnits";
import {
  ListProductUnitsService,
  DeleteProductUnitService
} from "../services/ProductUnitServices/ProductUnitServices";
import CreateProductUnitService from "../services/ProductUnitServices/CreateProductUnitService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, status, categoryId, pageNumber } = req.query;
  const data = await ListProductsService({
    companyId,
    searchParam: String(searchParam || ""),
    status: status ? String(status) : undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    pageNumber: pageNumber as string | number | undefined
  });
  return res.json(data);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  const product = await ShowProductService(id, companyId);
  return res.json(product);
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
    attributes: [
      "id",
      "name",
      "code",
      "category",
      "categoryId",
      "subcategoryId",
      "unit",
      "price",
      "description"
    ],
    include: [
      { model: ProductCategory, as: "productCategory", required: false },
      { model: ProductCategory, as: "productSubcategory", required: false }
    ]
  });
  return res.json(products);
};

export const listUnits = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const custom = await ListProductUnitsService(companyId);
  return res.json({
    defaultUnits: DEFAULT_PRODUCT_UNITS,
    customUnits: custom
  });
};

export const storeUnit = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const unit = await CreateProductUnitService({ companyId, ...req.body });
  return res.status(201).json(unit);
};

export const removeUnit = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  await DeleteProductUnitService(id, companyId);
  return res.status(200).json({ ok: true });
};

export const uploadImage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const id = parseInt(req.params.id, 10);
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    return res.status(400).json({ error: "ERR_NO_FILE" });
  }
  const imageUrl = `/public/company${companyId}/products/${file.filename}`;
  const product = await UpdateProductService({
    id,
    companyId,
    imageUrl
  });
  return res.json(product);
};
