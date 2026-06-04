import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";
import * as WhatsappStatusController from "../controllers/WhatsappStatusController";

const routes = express.Router();
const upload = multer(uploadConfig);

routes.get("/whatsapp-statuses", isAuth, WhatsappStatusController.index);
routes.get("/whatsapp-statuses/stats", isAuth, WhatsappStatusController.stats);
routes.post("/whatsapp-statuses", isAuth, upload.array("file"), WhatsappStatusController.store);
routes.put("/whatsapp-statuses/:id", isAuth, upload.array("file"), WhatsappStatusController.update);
routes.post("/whatsapp-statuses/:id/publish", isAuth, WhatsappStatusController.publish);
routes.post("/whatsapp-statuses/:id/duplicate", isAuth, WhatsappStatusController.duplicate);
routes.post("/whatsapp-statuses/:id/cancel", isAuth, WhatsappStatusController.cancel);
routes.delete("/whatsapp-statuses/:id", isAuth, WhatsappStatusController.remove);

export default routes;
