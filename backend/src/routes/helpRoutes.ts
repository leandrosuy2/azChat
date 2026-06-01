import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadHelpConfig from "../config/uploadHelp";
import AppError from "../errors/AppError";

import * as HelpController from "../controllers/HelpController";

const routes = express.Router();
const uploadHelp = multer(uploadHelpConfig);
const isAdmin: express.RequestHandler = (req, _res, next) => {
  if (req.user.profile !== "admin") {
    throw new AppError("Você não possui permissão para acessar este recurso!", 403);
  }

  return next();
};

// Rotas estáticas antes de /helps/:id para não serem capturadas por :id
routes.get("/helps/list", isAuth, HelpController.findList);

routes.get("/helps/areas", isAuth, HelpController.listAreas);

routes.get("/helps/by-area/:areaKey", isAuth, HelpController.byArea);

routes.get("/helps", isAuth, HelpController.index);

routes.get("/helps/:id", isAuth, HelpController.show);

routes.post("/helps", isAuth, isAdmin, HelpController.store);

routes.put("/helps/:id", isAuth, isAdmin, HelpController.update);

routes.delete("/helps/:id", isAuth, isAdmin, HelpController.remove);

routes.post(
  "/helps/:id/attachments",
  isAuth,
  isAdmin,
  uploadHelp.single("file"),
  HelpController.addAttachment
);

routes.delete(
  "/helps/:id/attachments/:attachmentId",
  isAuth,
  isAdmin,
  HelpController.removeAttachment
);

export default routes;
