import { Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import Ticket from "../../models/Ticket";
import TicketQuadro from "../../models/TicketQuadro";
import TicketTag from "../../models/TicketTag";
import Tag from "../../models/Tag";
import AppError from "../../errors/AppError";

interface MoveTicketQuadroRequest {
  ticketId: number;
  companyId: number;
  targetGroupId: number;
  targetTagId?: number;
  userId?: number;
}

interface MoveTicketQuadroResponse {
  ticket: Ticket | null;
  quadro: TicketQuadro;
}

/**
 * Cartões «quadro livre» no Kanban usam id sintético `-TicketQuadros.id` (sem linha em Tickets).
 * Nesse caso movemos só a linha TicketQuadro com ticketId null.
 */
const MoveTicketQuadroService = async ({
  ticketId,
  companyId,
  targetGroupId,
  targetTagId,
  userId
}: MoveTicketQuadroRequest): Promise<MoveTicketQuadroResponse> => {
  if (ticketId < 0) {
    const rowId = Math.abs(ticketId);
    const standaloneQuadro = await TicketQuadro.findOne({
      where: { id: rowId, companyId, ticketId: null }
    });
    if (!standaloneQuadro) {
      throw new AppError("ERR_NO_TICKET_FOUND", 404);
    }
    const previousMainGroupId = standaloneQuadro.quadroGroupId ?? null;
    const newShared = (standaloneQuadro.sharedGroupIds ?? []).filter(
      (g) => g !== previousMainGroupId
    );
    const patch: {
      quadroGroupId: number;
      sharedGroupIds: number[];
      kanbanTagId?: number | null;
    } = {
      quadroGroupId: targetGroupId,
      sharedGroupIds: newShared
    };
    if (targetTagId != null) {
      const tag = await Tag.findOne({
        where: {
          id: targetTagId,
          companyId,
          kanban: 1,
          quadroGroupId: targetGroupId
        }
      });
      if (!tag) {
        throw new AppError("ERR_INVALID_TAG", 400);
      }
      patch.kanbanTagId = targetTagId;
    } else if (standaloneQuadro.quadroGroupId !== targetGroupId) {
      patch.kanbanTagId = null;
    }
    await standaloneQuadro.update(patch);
    await standaloneQuadro.reload();
    return { ticket: null, quadro: standaloneQuadro };
  }

  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id", "quadroGroupId", "userId", "companyId"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const quadro = await TicketQuadro.findOne({
    where: { ticketId: ticket.id }
  });

  const previousMainGroupId = ticket.quadroGroupId ?? quadro?.quadroGroupId ?? null;

  const updateTicket: { quadroGroupId: number; userId?: number } = {
    quadroGroupId: targetGroupId
  };
  if (userId != null) {
    updateTicket.userId = userId;
  }
  await ticket.update(updateTicket);

  let updatedQuadro: TicketQuadro;
  if (quadro) {
    const newShared = (quadro.sharedGroupIds ?? []).filter(
      (g) => g !== previousMainGroupId
    );
    await quadro.update({
      quadroGroupId: targetGroupId,
      sharedGroupIds: newShared
    });
    updatedQuadro = quadro;
  } else {
    updatedQuadro = await TicketQuadro.create({
      uuid: uuidv4(),
      ticketId: ticket.id,
      companyId,
      quadroGroupId: targetGroupId,
      sharedGroupIds: [],
      status: "aguardando"
    });
  }

  if (targetTagId != null) {
    const kanbanTags = await Tag.findAll({
      where: { companyId, kanban: 1, quadroGroupId: targetGroupId },
      attributes: ["id"]
    });
    const kanbanTagIds = kanbanTags.map((t) => t.id);
    if (kanbanTagIds.length > 0) {
      await TicketTag.destroy({
        where: {
          ticketId: ticket.id,
          tagId: { [Op.in]: kanbanTagIds }
        }
      });
    }
    await TicketTag.findOrCreate({
      where: { ticketId: ticket.id, tagId: targetTagId },
      defaults: { ticketId: ticket.id, tagId: targetTagId }
    });
  }

  return {
    ticket,
    quadro: updatedQuadro
  };
};

export default MoveTicketQuadroService;
