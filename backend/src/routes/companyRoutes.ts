import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadCompanyLogoConfig from "../config/uploadCompanyLogo";

import * as CompanyController from "../controllers/CompanyController";

const uploadLogo = multer(uploadCompanyLogoConfig);

const companyRoutes = express.Router();

companyRoutes.get("/companies/list", isAuth, CompanyController.list);
companyRoutes.get("/companies", isAuth, CompanyController.index);
companyRoutes.get("/companies/:id", isAuth, CompanyController.show);
companyRoutes.post("/companies", isAuth, CompanyController.store);
companyRoutes.put("/companies/:id", isAuth, CompanyController.update);
companyRoutes.put(
  "/companies/:id/schedules",
  isAuth,
  CompanyController.updateSchedules
);
companyRoutes.delete("/companies/:id", isAuth, CompanyController.remove);

companyRoutes.post(
  "/companies/:id/logo",
  isAuth,
  uploadLogo.single("file"),
  CompanyController.uploadLogo
);
companyRoutes.delete(
  "/companies/:id/logo",
  isAuth,
  CompanyController.removeLogo
);

companyRoutes.get("/companies/listPlan/:id", isAuth, CompanyController.listPlan);
companyRoutes.get("/companiesPlan", isAuth, CompanyController.indexPlan);

export default companyRoutes;
