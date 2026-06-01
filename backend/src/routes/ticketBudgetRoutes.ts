import express from "express";
import isAuth from "../middleware/isAuth";
import * as TicketBudgetController from "../controllers/TicketBudgetController";
import * as PublicTicketBudgetController from "../controllers/PublicTicketBudgetController";
import uploadBudgetPdfTemp from "../config/uploadBudgetPdfTemp";

const ticketBudgetRoutes = express.Router();

ticketBudgetRoutes.get(
  "/ticket-budgets/ticket/:ticketId",
  isAuth,
  TicketBudgetController.listByTicket
);

ticketBudgetRoutes.get(
  "/ticket-budgets/:id",
  isAuth,
  TicketBudgetController.show
);

ticketBudgetRoutes.post("/ticket-budgets", isAuth, TicketBudgetController.store);

ticketBudgetRoutes.put(
  "/ticket-budgets/:id",
  isAuth,
  TicketBudgetController.update
);

ticketBudgetRoutes.post(
  "/ticket-budgets/:id/approve-agent",
  isAuth,
  TicketBudgetController.approveAgent
);

ticketBudgetRoutes.post(
  "/ticket-budgets/:id/reject-agent",
  isAuth,
  TicketBudgetController.rejectAgent
);

ticketBudgetRoutes.post(
  "/ticket-budgets/:id/send-link-whatsapp",
  isAuth,
  TicketBudgetController.sendLinkWhatsApp
);

ticketBudgetRoutes.post(
  "/ticket-budgets/:id/send-pdf-whatsapp",
  isAuth,
  uploadBudgetPdfTemp.single("pdf"),
  TicketBudgetController.sendPdfWhatsApp
);

ticketBudgetRoutes.post(
  "/ticket-budgets/:id/send-order-pdf-whatsapp",
  isAuth,
  uploadBudgetPdfTemp.single("pdf"),
  TicketBudgetController.sendOrderPdfWhatsApp
);

ticketBudgetRoutes.get(
  "/public/ticket-budgets/:token",
  PublicTicketBudgetController.showByToken
);

ticketBudgetRoutes.post(
  "/public/ticket-budgets/:token/approve",
  PublicTicketBudgetController.approve
);

ticketBudgetRoutes.post(
  "/public/ticket-budgets/:token/reject",
  PublicTicketBudgetController.reject
);

export default ticketBudgetRoutes;
