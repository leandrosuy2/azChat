import express from "express";
import isAuth from "../middleware/isAuth";
import * as ProductController from "../controllers/ProductController";

const productRoutes = express.Router();

productRoutes.get("/products", isAuth, ProductController.index);
productRoutes.get("/products/active", isAuth, ProductController.listActive);
productRoutes.post("/products", isAuth, ProductController.store);
productRoutes.put("/products/:id", isAuth, ProductController.update);
productRoutes.delete("/products/:id", isAuth, ProductController.remove);

export default productRoutes;
