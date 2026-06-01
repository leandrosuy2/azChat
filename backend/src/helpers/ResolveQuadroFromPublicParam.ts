import { v4 as uuidv4 } from "uuid";
import Ticket from "../models/Ticket";
import TicketQuadro from "../models/TicketQuadro";
import AppError from "../errors/AppError";
import { buildTicketWhereUuidOrId } from "./FindTicketByUuidOrId";

export type QuadroResolution =
  | { mode: "ticket"; ticket: Ticket; quadro: TicketQuadro | null }
  | { mode: "standalone"; quadro: TicketQuadro; ticket: null };

/**
 * Resolve um quadro a partir do mesmo identificador público usado nas rotas:
 * — UUID do ticket (atendimento) ou id numérico do ticket
 * — UUID da linha TicketQuadro (quadro livre, sem ticket)
 */
export const resolveQuadroContext = async (
  publicParam: string,
  companyId: number
): Promise<QuadroResolution> => {
  const trimmed = String(publicParam || "").trim();
  if (!trimmed) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const ticket = await Ticket.findOne({
    where: buildTicketWhereUuidOrId(trimmed, companyId),
    attributes: ["id", "uuid", "companyId"]
  });

  if (ticket) {
    const quadro = await TicketQuadro.findOne({ where: { ticketId: ticket.id } });
    return { mode: "ticket", ticket, quadro };
  }

  /** Mesmo UUID público do Kanban: linha em TicketQuadros (pode estar só no quadro livre ou vinculada a ticket). */
  const quadro = await TicketQuadro.findOne({
    where: { uuid: trimmed, companyId }
  });

  if (!quadro) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  if (quadro.ticketId) {
    const linkedTicket = await Ticket.findOne({
      where: { id: quadro.ticketId, companyId },
      attributes: ["id", "uuid", "companyId"]
    });
    if (linkedTicket) {
      return { mode: "ticket", ticket: linkedTicket, quadro };
    }
  }

  return { mode: "standalone", quadro, ticket: null };
};

/** Garante TicketQuadro com uuid para ticket vinculado (migração exige uuid em todas as linhas). */
export const ensureQuadroRowForTicket = async (
  ticketId: number,
  companyId: number,
  defaults: Partial<{ status: string; description: string | null }> = {}
): Promise<TicketQuadro> => {
  let quadro = await TicketQuadro.findOne({ where: { ticketId } });
  if (!quadro) {
    quadro = await TicketQuadro.create({
      uuid: uuidv4(),
      ticketId,
      companyId,
      status: defaults.status ?? "aguardando",
      description: defaults.description ?? null
    });
  }
  return quadro;
};
