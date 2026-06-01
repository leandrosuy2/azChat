import Ticket from "../../models/Ticket";
import TicketQuadro from "../../models/TicketQuadro";
import QuadroStatusLog from "../../models/QuadroStatusLog";
import User from "../../models/User";
import AppError from "../../errors/AppError";
import { buildTicketWhereUuidOrId } from "../../helpers/FindTicketByUuidOrId";

export interface QuadroLogItem {
  id: number;
  fromLabel: string | null;
  toLabel: string | null;
  userName: string;
  createdAt: Date;
}

const ListQuadroLogsService = async (
  ticketUuid: string,
  companyId: number
): Promise<{ logs: QuadroLogItem[] }> => {
  const trimmed = String(ticketUuid || "").trim();

  const ticket = await Ticket.findOne({
    where: buildTicketWhereUuidOrId(trimmed, companyId),
    attributes: ["id"]
  });

  let effectiveTicketId: number | null = ticket?.id ?? null;

  if (effectiveTicketId == null) {
    const quadro = await TicketQuadro.findOne({
      where: { uuid: trimmed, companyId }
    });
    if (quadro?.ticketId) {
      const linked = await Ticket.findOne({
        where: { id: quadro.ticketId, companyId },
        attributes: ["id"]
      });
      effectiveTicketId = linked?.id ?? null;
    } else if (quadro && !quadro.ticketId) {
      return { logs: [] };
    }
  }

  if (effectiveTicketId == null) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const logs = await QuadroStatusLog.findAll({
    where: { ticketId: effectiveTicketId },
    include: [{ model: User, as: "user", attributes: ["name"] }],
    order: [["createdAt", "DESC"]]
  });

  const items: QuadroLogItem[] = logs.map((log) => ({
    id: log.id,
    fromLabel: log.fromLabel,
    toLabel: log.toLabel,
    userName: (log as any).user?.name ?? "",
    createdAt: log.createdAt
  }));

  return { logs: items };
};

export default ListQuadroLogsService;
