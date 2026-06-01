import express from "express";
import isAuth from "../middleware/isAuth";

import * as DashboardController from "../controllers/DashbardController";
import * as CommercialMetricsController from "../controllers/CommercialMetricsController";

const routes = express.Router();

routes.get("/dashboard", isAuth, DashboardController.index);
routes.get("/dashboard/ticketsUsers", DashboardController.reportsUsers);
routes.get("/dashboard/ticketsDay", DashboardController.reportsDay);
routes.get("/dashboard/moments",isAuth, DashboardController.DashTicketsQueues);
routes.get(
  "/dashboard/commercial-metrics",
  isAuth,
  CommercialMetricsController.index
);
routes.get(
  "/contacts/:contactId/financial",
  isAuth,
  CommercialMetricsController.contactFinancial
);

export default routes;
