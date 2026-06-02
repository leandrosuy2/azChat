import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import CreateStandaloneTicketQuadroService from "../services/QuadroServices/CreateStandaloneTicketQuadroService";
import UpdateStandaloneQuadroLaneService from "../services/QuadroServices/UpdateStandaloneQuadroLaneService";
import DeleteStandaloneTicketQuadroService from "../services/QuadroServices/DeleteStandaloneTicketQuadroService";
import UpdateStandaloneQuadroLinkedContactService from "../services/QuadroServices/UpdateStandaloneQuadroLinkedContactService";
import { assertKanbanPermission } from "../helpers/checkKanbanPermission";

const emitKanbanRefresh = (companyId: number): void => {
  getIO().of(String(companyId)).emit(`company-${companyId}-ticket`, {
    action: "update",
    ticket: { id: 0 }
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  assertKanbanPermission(req.user, "create");
  const { companyId } = req.user;
  const { nomeProjeto, quadroGroupId, linkedContactId, kanbanTagId } = req.body;

  if (quadroGroupId == null) {
    return res.status(400).json({ error: "quadroGroupId é obrigatório" });
  }

  const quadro = await CreateStandaloneTicketQuadroService({
    companyId,
    nomeProjeto: nomeProjeto ?? "",
    quadroGroupId: Number(quadroGroupId),
    linkedContactId: linkedContactId != null ? Number(linkedContactId) : null,
    kanbanTagId: kanbanTagId != null ? Number(kanbanTagId) : null
  });

  emitKanbanRefresh(companyId);

  return res.status(201).json({
    quadro: {
      uuid: quadro.uuid,
      nomeProjeto: quadro.nomeProjeto,
      quadroGroupId: quadro.quadroGroupId,
      linkedContactId: quadro.linkedContactId,
      kanbanTagId: quadro.kanbanTagId
    }
  });
};

export const updateLane = async (req: Request, res: Response): Promise<Response> => {
  assertKanbanPermission(req.user, "moveCard");
  const { uuid } = req.params;
  const { companyId } = req.user;
  const { targetLaneId } = req.body;

  const quadro = await UpdateStandaloneQuadroLaneService(uuid, companyId, targetLaneId ?? null);
  emitKanbanRefresh(companyId);

  return res.status(200).json({
    quadro: {
      uuid: quadro.uuid,
      kanbanTagId: quadro.kanbanTagId
    }
  });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  assertKanbanPermission(req.user, "delete");
  const { uuid } = req.params;
  const { companyId } = req.user;

  await DeleteStandaloneTicketQuadroService(uuid, companyId);
  emitKanbanRefresh(companyId);

  return res.status(204).send();
};

export const updateLinkedContact = async (req: Request, res: Response): Promise<Response> => {
  assertKanbanPermission(req.user, "edit");
  const { uuid } = req.params;
  const { companyId } = req.user;
  const { linkedContactId } = req.body;

  const quadro = await UpdateStandaloneQuadroLinkedContactService(
    uuid,
    companyId,
    linkedContactId === undefined ? null : linkedContactId != null ? Number(linkedContactId) : null
  );

  emitKanbanRefresh(companyId);

  return res.status(200).json({
    quadro: {
      uuid: quadro.uuid,
      linkedContactId: quadro.linkedContactId
    }
  });
};
