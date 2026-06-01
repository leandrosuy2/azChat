import express from "express";
import isAuth from "../middleware/isAuth";

import * as QuadroGroupController from "../controllers/QuadroGroupController";
import * as QuadroStatusController from "../controllers/QuadroStatusController";
import * as StandaloneTicketQuadroController from "../controllers/StandaloneTicketQuadroController";

const quadroRoutes = express.Router();

// Quadro Groups (Áreas de Trabalho)
quadroRoutes.get("/quadro-groups", isAuth, QuadroGroupController.index);
quadroRoutes.post("/quadro-groups", isAuth, QuadroGroupController.store);
quadroRoutes.put("/quadro-groups/:id", isAuth, QuadroGroupController.update);
quadroRoutes.delete("/quadro-groups/:id", isAuth, QuadroGroupController.remove);

// Quadro Statuses (Status Personalizados)
quadroRoutes.get("/quadro-statuses", isAuth, QuadroStatusController.index);
quadroRoutes.put("/quadro-statuses", isAuth, QuadroStatusController.update);

// Quadros Kanban sem ticket (livres)
quadroRoutes.post("/standalone-ticket-quadros", isAuth, StandaloneTicketQuadroController.store);
quadroRoutes.delete("/standalone-ticket-quadros/:uuid", isAuth, StandaloneTicketQuadroController.remove);
quadroRoutes.put("/standalone-ticket-quadros/:uuid/lane", isAuth, StandaloneTicketQuadroController.updateLane);
quadroRoutes.put("/standalone-ticket-quadros/:uuid/linked-contact", isAuth, StandaloneTicketQuadroController.updateLinkedContact);

export default quadroRoutes;
