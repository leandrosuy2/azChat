import Ticket from "../models/Ticket";
import AppError from "../errors/AppError";
import { buildTicketWhereUuidOrId } from "./FindTicketByUuidOrId";

/**
 * Resolve o id numérico do ticket a partir do parâmetro de rota (id ou uuid).
 * Usado em rotas como `/tickets/:ticketId/anotacoes` onde o frontend envia o uuid da URL.
 */
export async function resolveTicketIdFromRouteParam(
  uuidOrId: string,
  companyId: number
): Promise<number> {
  const where = buildTicketWhereUuidOrId(uuidOrId, companyId);
  const ticket = await Ticket.findOne({
    where,
    attributes: ["id"]
  });
  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }
  return ticket.id;
}
