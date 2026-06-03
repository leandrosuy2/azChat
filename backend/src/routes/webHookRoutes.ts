import { Router } from "express";
import * as WebHooksController from "../controllers/WebHookController";
const webHooksRoutes = Router();

webHooksRoutes.get("/", WebHooksController.index);
webHooksRoutes.post("/", WebHooksController.webHook);
webHooksRoutes.get("/meta/:companyId/:integrationId", WebHooksController.metaVerify);
webHooksRoutes.post("/meta/:companyId/:integrationId", WebHooksController.metaWebHook);
export default webHooksRoutes;
