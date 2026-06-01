import { Router } from "express";
import * as MetaController from "../controllers/MetaController";

const metaRoutes = Router();

metaRoutes.post("/meta/data-deletion", MetaController.dataDeletion);
metaRoutes.get("/meta/data-deletion", MetaController.dataDeletion);
metaRoutes.get("/meta/data-deletion/status", MetaController.dataDeletionStatus);

export default metaRoutes;
