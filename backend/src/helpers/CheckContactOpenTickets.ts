import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Ticket from "../models/Ticket";

/**
 * Impede mais de um ticket open/pending para o mesmo contato + conexão WhatsApp.
 * Se `quadroGroupId` for informado, a regra aplica-se **por área de Kanban**:
 * o mesmo contato pode ter um ticket aberto em cada área; sem área (`null`),
 * considera-se apenas tickets sem `quadroGroupId`.
 */
const CheckContactOpenTickets = async (
  contactId: number,
  whatsappId: number,
  companyId: number,
  quadroGroupId?: number | null
): Promise<void> => {
  const statusFilter = { [Op.or]: ["open", "pending"] as const };

  const qg =
    quadroGroupId != null && !Number.isNaN(Number(quadroGroupId))
      ? Number(quadroGroupId)
      : null;

  // No Kanban por área, permitimos múltiplos tickets para o mesmo contato.
  // Isso evita reaproveitar ticket existente e permite criar um novo card com nome próprio.
  if (qg != null) {
    return;
  }

  const where: Record<string, unknown> = {
    contactId,
    whatsappId,
    companyId,
    status: statusFilter
  };

  where.quadroGroupId = { [Op.is]: null };

  const ticket = await Ticket.findOne({ where });

  if (ticket) {
    throw new AppError("ERR_OTHER_OPEN_TICKET");
  }
};

export default CheckContactOpenTickets;
