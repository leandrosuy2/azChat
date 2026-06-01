import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadQuadroConfig from "../config/uploadQuadro";
import uploadAnotacaoConfig from "../config/uploadAnotacao";

import * as TicketController from "../controllers/TicketController";
import * as QuadroController from "../controllers/QuadroController";
import * as TicketFloatingController from "../controllers/TicketFloatingController";

const ticketRoutes = express.Router();
const uploadQuadro = multer(uploadQuadroConfig);
const uploadAnotacao = multer(uploadAnotacaoConfig);

const anotacaoUploadOptional = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.is("multipart/form-data")) {
    return uploadAnotacao.single("file")(req, res, next);
  }
  next();
};

ticketRoutes.get("/tickets", isAuth, TicketController.index);

ticketRoutes.get(
  "/notifications/lembretes",
  isAuth,
  TicketFloatingController.listRecentLembreteNotifications
);
ticketRoutes.get(
  "/notifications/kanban",
  isAuth,
  TicketFloatingController.listRecentKanbanNotifications
);
ticketRoutes.delete(
  "/notifications/lembretes/:disparoId",
  isAuth,
  TicketFloatingController.deleteLembreteNotification
);
ticketRoutes.delete(
  "/notifications/kanban/:logId",
  isAuth,
  TicketFloatingController.deleteKanbanNotification
);

ticketRoutes.get("/tickets-log/:ticketId", isAuth, TicketController.showLog);

ticketRoutes.get("/ticket/kanban", isAuth, TicketController.kanban);

ticketRoutes.put("/tickets/kanban/reorder", isAuth, TicketController.kanbanCardsReorder);

ticketRoutes.get("/ticketreport/reports", isAuth, TicketController.report);

ticketRoutes.get("/tickets/u/:uuid", isAuth, TicketController.showFromUUID);

ticketRoutes.get("/tickets/:ticketUuid/quadro/logs", isAuth, QuadroController.listLogs);
ticketRoutes.get("/tickets/:ticketUuid/quadro", isAuth, QuadroController.getQuadro);
ticketRoutes.put("/tickets/:ticketUuid/quadro/status", isAuth, QuadroController.updateStatus);
ticketRoutes.put("/tickets/:ticketUuid/quadro/description", isAuth, QuadroController.updateDescription);
ticketRoutes.post("/tickets/:ticketUuid/quadro/attachments", isAuth, uploadQuadro.single("file"), QuadroController.uploadAttachment);
ticketRoutes.patch("/tickets/:ticketUuid/quadro/attachments/:attachmentId/capa", isAuth, QuadroController.setAttachmentCapa);
ticketRoutes.patch("/tickets/:ticketUuid/quadro/attachments/:attachmentId/meta", isAuth, QuadroController.updateAttachmentMeta);
ticketRoutes.delete("/tickets/:ticketUuid/quadro/attachments/:attachmentId", isAuth, QuadroController.deleteAttachment);
ticketRoutes.put("/tickets/:ticketId/quadro/attachments/:attachmentId/rename", isAuth, QuadroController.renameAttachment);
ticketRoutes.put("/tickets/:ticketUuid/quadro/attachments/:attachmentId/rename", isAuth, QuadroController.renameAttachment);

ticketRoutes.post("/tickets", isAuth, TicketController.store);

ticketRoutes.put("/tickets/:ticketId/quadro", isAuth, QuadroController.updateValues);
ticketRoutes.post("/tickets/:ticketId/quadro/move", isAuth, QuadroController.move);
ticketRoutes.put("/tickets/:ticketId", isAuth, TicketController.update);
ticketRoutes.put("/tickets/:ticketId/contact", isAuth, TicketController.updateContact);
ticketRoutes.post("/tickets/:ticketId/quadro/log", isAuth, QuadroController.createLog);
ticketRoutes.get("/tickets/:ticketId/quadro/logs", isAuth, QuadroController.listLogs);
ticketRoutes.post("/tickets/:ticketId/quadro/share", isAuth, QuadroController.share);
ticketRoutes.patch(
  "/tickets/:ticketId/quadro/kanban-mirror-lane",
  isAuth,
  QuadroController.updateMirrorKanbanLane
);

ticketRoutes.get("/tickets/:ticketId", isAuth, TicketController.show);

ticketRoutes.get("/tickets/:ticketId/eventos", isAuth, TicketFloatingController.listEventos);
ticketRoutes.post("/tickets/:ticketId/eventos", isAuth, TicketFloatingController.createEvento);
ticketRoutes.delete("/tickets/:ticketId/eventos/:eventoId", isAuth, TicketFloatingController.deleteEvento);

ticketRoutes.get("/tickets/:ticketId/anotacoes", isAuth, TicketFloatingController.listAnotacoes);
ticketRoutes.post("/tickets/:ticketId/anotacoes", isAuth, anotacaoUploadOptional, TicketFloatingController.createAnotacao);
ticketRoutes.patch("/tickets/:ticketId/anotacoes/:anotacaoId", isAuth, TicketFloatingController.updateAnotacao);
ticketRoutes.delete("/tickets/:ticketId/anotacoes/:anotacaoId", isAuth, TicketFloatingController.deleteAnotacao);

ticketRoutes.get("/tickets/:ticketId/lembretes", isAuth, TicketFloatingController.listLembretes);
ticketRoutes.post("/tickets/:ticketId/lembretes", isAuth, TicketFloatingController.createLembrete);
ticketRoutes.put("/tickets/:ticketId/lembretes/:lembreteId", isAuth, TicketFloatingController.updateLembrete);
ticketRoutes.delete("/tickets/:ticketId/lembretes/:lembreteId", isAuth, TicketFloatingController.deleteLembrete);
ticketRoutes.get(
  "/tickets/:ticketId/lembretes/:lembreteId/disparos",
  isAuth,
  TicketFloatingController.listLembreteDisparos
);
ticketRoutes.post(
  "/tickets/:ticketId/lembretes/:lembreteId/test",
  isAuth,
  TicketFloatingController.testLembreteDispatch
);

ticketRoutes.delete("/tickets/:ticketId", isAuth, TicketController.remove);

ticketRoutes.post("/tickets/closeAll", isAuth, TicketController.closeAll);

export default ticketRoutes;
