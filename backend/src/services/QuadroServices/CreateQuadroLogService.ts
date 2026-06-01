import Ticket from "../../models/Ticket";
import QuadroStatusLog from "../../models/QuadroStatusLog";
import AppError from "../../errors/AppError";

interface CreateQuadroLogData {
  ticketId: number;
  companyId: number;
  userId: number;
  fromLaneId?: string;
  toLaneId?: string;
  fromLabel?: string;
  toLabel?: string;
}

const CreateQuadroLogService = async (data: CreateQuadroLogData): Promise<QuadroStatusLog> => {
  const ticket = await Ticket.findOne({
    where: { id: data.ticketId, companyId: data.companyId },
    attributes: ["id"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const log = await QuadroStatusLog.create({
    ticketId: data.ticketId,
    companyId: data.companyId,
    userId: data.userId,
    fromLaneId: data.fromLaneId ?? null,
    toLaneId: data.toLaneId ?? null,
    fromLabel: data.fromLabel ?? null,
    toLabel: data.toLabel ?? null
  });

  return log;
};

export default CreateQuadroLogService;
