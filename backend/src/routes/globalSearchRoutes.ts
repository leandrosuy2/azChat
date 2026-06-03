import express from "express";
import isAuth from "../middleware/isAuth";
import * as GlobalSearchController from "../controllers/GlobalSearchController";

const globalSearchRoutes = express.Router();

globalSearchRoutes.get("/global-search", isAuth, GlobalSearchController.index);

export default globalSearchRoutes;
