import { Request, Response } from "express";
import TicketTag from "../models/TicketTag";
import Tag from "../models/Tag";
import TicketQuadro from "../models/TicketQuadro";
import { getIO } from "../libs/socket";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DispatchKanbanLembreteService from "../services/TicketLembreteServices/DispatchKanbanLembreteService";

/** Front usa id negativo (-TicketQuadro.id) para cartões standalone (sem Ticket). */
function parseKanbanTicketId(raw: string): { standaloneQuadroId: number | null; ticketId: number } {
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n)) {
    return { standaloneQuadroId: null, ticketId: NaN };
  }
  if (n < 0) {
    return { standaloneQuadroId: Math.abs(n), ticketId: n };
  }
  return { standaloneQuadroId: null, ticketId: n };
}

function emitKanbanRefresh(companyId: number): void {
  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
    action: "update"
  });
}

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId: ticketIdParam, tagId: tagIdParam } = req.params;
  const { companyId } = req.user;

  try {
    const tagIdNum = parseInt(String(tagIdParam), 10);
    if (Number.isNaN(tagIdNum)) {
      return res.status(400).json({ error: "tagId inválido" });
    }

    const { standaloneQuadroId, ticketId } = parseKanbanTicketId(ticketIdParam);
    if (Number.isNaN(ticketId)) {
      return res.status(400).json({ error: "ticketId inválido" });
    }

    const tagRow = await Tag.findByPk(tagIdNum);

    if (standaloneQuadroId != null) {
      const quadro = await TicketQuadro.findOne({
        where: { id: standaloneQuadroId, companyId }
      });
      if (!quadro) {
        return res.status(404).json({ error: "Cartão (quadro) não encontrado." });
      }
      const validTag = await Tag.findOne({
        where: {
          id: tagIdNum,
          companyId,
          kanban: 1,
          quadroGroupId: quadro.quadroGroupId
        }
      });
      if (!validTag) {
        return res
          .status(400)
          .json({ error: "Etapa inválida para o quadro deste cartão." });
      }
      await quadro.update({ kanbanTagId: tagIdNum });
      if (quadro.ticketId != null) {
        try {
          await DispatchKanbanLembreteService(quadro.ticketId, companyId, {
            tipo: "movimentacao",
            colunaNome: tagRow?.name || "—"
          });
        } catch (e) {
          console.error("[ticketTag kanban lembrete standalone]", e);
        }
      }
      emitKanbanRefresh(companyId);
      return res.status(201).json({ ticketId: ticketIdParam, tagId: tagIdNum, standalone: true });
    }

    const ticketTag = await TicketTag.create({
      ticketId,
      tagId: tagIdNum
    });

    try {
      await DispatchKanbanLembreteService(ticketId, companyId, {
        tipo: "movimentacao",
        colunaNome: tagRow?.name || "—"
      });
    } catch (e) {
      console.error("[ticketTag kanban lembrete]", e);
    }

    const ticket = await ShowTicketService(ticketId, companyId);

    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });

    return res.status(201).json(ticketTag);
  } catch (error) {
    console.error("[ticketTag store]", error);
    return res.status(500).json({ error: "Failed to store ticket tag." });
  }
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId: ticketIdParam } = req.params;
  const { companyId } = req.user;

  try {
    const { standaloneQuadroId, ticketId } = parseKanbanTicketId(ticketIdParam);
    if (Number.isNaN(ticketId)) {
      return res.status(400).json({ error: "ticketId inválido" });
    }

    if (standaloneQuadroId != null) {
      const quadro = await TicketQuadro.findOne({
        where: { id: standaloneQuadroId, companyId }
      });
      if (!quadro) {
        return res.status(404).json({ error: "Cartão (quadro) não encontrado." });
      }
      await quadro.update({ kanbanTagId: null });
      emitKanbanRefresh(companyId);
      return res.status(200).json({ message: "Ticket tags removed successfully." });
    }

    const ticketTags = await TicketTag.findAll({ where: { ticketId } });
    const tagIds = ticketTags.map((tt) => tt.tagId);

    const tagsWithKanbanOne = await Tag.findAll({
      where: {
        id: tagIds,
        kanban: 1
      }
    });

    const tagIdsWithKanbanOne = tagsWithKanbanOne.map((tag) => tag.id);
    if (tagIdsWithKanbanOne.length > 0) {
      await TicketTag.destroy({ where: { ticketId, tagId: tagIdsWithKanbanOne } });
    }

    const ticket = await ShowTicketService(ticketId, companyId);

    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });
    return res.status(200).json({ message: "Ticket tags removed successfully." });
  } catch (error) {
    console.error("[ticketTag remove]", error);
    return res.status(500).json({ error: "Failed to remove ticket tags." });
  }
};
