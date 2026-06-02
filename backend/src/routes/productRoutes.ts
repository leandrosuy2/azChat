import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import * as ProductController from "../controllers/ProductController";
import * as ProductCategoryController from "../controllers/ProductCategoryController";
import uploadProductImageConfig from "../config/uploadProductImage";

const productRoutes = express.Router();
const uploadProductImage = multer(uploadProductImageConfig);

productRoutes.get("/products", isAuth, ProductController.index);
productRoutes.get("/products/active", isAuth, ProductController.listActive);
productRoutes.get("/products/units", isAuth, ProductController.listUnits);
productRoutes.post("/products/units", isAuth, ProductController.storeUnit);
productRoutes.delete("/products/units/:id", isAuth, ProductController.removeUnit);
productRoutes.get("/products/:id", isAuth, ProductController.show);
productRoutes.post("/products", isAuth, ProductController.store);
productRoutes.put("/products/:id", isAuth, ProductController.update);
productRoutes.delete("/products/:id", isAuth, ProductController.remove);
productRoutes.post(
  "/products/:id/image",
  isAuth,
  uploadProductImage.single("file"),
  ProductController.uploadImage
);

productRoutes.get(
  "/product-categories",
  isAuth,
  ProductCategoryController.index
);
productRoutes.post(
  "/product-categories",
  isAuth,
  ProductCategoryController.store
);
productRoutes.put(
  "/product-categories/:id",
  isAuth,
  ProductCategoryController.update
);
productRoutes.delete(
  "/product-categories/:id",
  isAuth,
  ProductCategoryController.remove
);

export default productRoutes;
