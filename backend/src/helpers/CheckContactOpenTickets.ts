import { col, fn, Op, where } from "sequelize";
import AppError from "../errors/AppError";
import Contact from "../models/Contact";
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

  const contact = await Contact.findOne({
    where: { id: contactId, companyId },
    attributes: ["id", "companyId", "number", "remoteJid", "channel"]
  });

  const remoteJid = String((contact as any)?.remoteJid || "")
    .trim()
    .toLowerCase();
  const number = String((contact as any)?.number || "").replace(/\D/g, "");
  const contactOr: any[] = [{ id: contactId }];

  if (remoteJid) {
    contactOr.push({ remoteJid: { [Op.iLike]: remoteJid } });
  }

  if (number) {
    contactOr.push(
      where(
        fn("REGEXP_REPLACE", col("contact.number"), "\\D", "", "g"),
        number
      )
    );
  }

  const ticketWhere: Record<string, unknown> = {
    whatsappId,
    companyId,
    status: statusFilter
  };

  ticketWhere.quadroGroupId = { [Op.is]: null };

  const ticket = await Ticket.findOne({
    where: ticketWhere,
    include: [
      {
        model: Contact,
        as: "contact",
        required: true,
        where: {
          companyId,
          [Op.or]: contactOr
        }
      }
    ]
  });

  if (ticket) {
    throw new AppError("ERR_OTHER_OPEN_TICKET");
  }
};

export default CheckContactOpenTickets;
