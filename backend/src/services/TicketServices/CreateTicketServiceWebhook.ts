import AppError from "../../errors/AppError";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import { getIO } from "../../libs/socket";
import ShowTicketService from "./ShowTicketService";
import { Op } from "sequelize";

interface Request {
  contactId: number;
  status: string;
  userId: number;
  companyId: number;
  queueId?: number;
  lastFlowId?: string;
  dataWebhook?: {};
  hashFlowId?: string;
  flowStopped?: string;
}

const CreateTicketServiceWebhook = async ({
  contactId,
  status,
  userId,
  queueId,
  companyId,
  lastFlowId,
  dataWebhook,
  hashFlowId,
  flowStopped
}: Request): Promise<Ticket> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(undefined, companyId);

  const isGroup = false;
  const contact = await Contact.findOne({
    where: { id: contactId, companyId },
    attributes: ["id", "companyId", "number", "remoteJid", "channel"]
  });
  const remoteJid = String((contact as any)?.remoteJid || "").trim();
  const number = String((contact as any)?.number || "").replace(/\D/g, "");
  const contactWhere: Record<string, unknown> = { companyId };
  if (remoteJid) {
    contactWhere.remoteJid = remoteJid;
  } else if (number) {
    contactWhere.number = number;
  } else {
    contactWhere.id = contactId;
  }

  const existingTicket = contact
    ? await Ticket.findOne({
        where: {
          companyId,
          channel: defaultWhatsapp.channel || "whatsapp",
          status: { [Op.in]: ["open", "pending", "group"] }
        },
        include: [
          {
            model: Contact,
            as: "contact",
            required: true,
            where: contactWhere
          }
        ],
        order: [["updatedAt", "DESC"], ["id", "DESC"]]
      })
    : null;

  if (existingTicket) {
    return ShowTicketService(existingTicket.id, companyId);
  }

  await CheckContactOpenTickets(contactId, defaultWhatsapp.id, companyId);

  const [{ id }] = await Ticket.findOrCreate({
    where: {
      contactId,
      companyId
    },
    defaults: {
      contactId,
      companyId,
      whatsappId: defaultWhatsapp.id,
      status,
      isGroup,
      userId,
      flowWebhook: true,
      dataWebhook: dataWebhook,
      hashFlowId: hashFlowId,
      flowStopped: flowStopped
    }
  });

  await Ticket.update(
    {
      companyId,
      queueId,
      userId,
      whatsappId: defaultWhatsapp.id,
      status: "open",
      flowWebhook: true,
      lastFlowId: lastFlowId,
      flowStopped: flowStopped
    },
    { where: { id } }
  );

  const ticket = await Ticket.findByPk(id, { include: ["contact", "queue"] });

  if (!ticket) {
    throw new AppError("ERR_CREATING_TICKET");
  }

  const io = getIO();

  io.to(ticket.id.toString()).emit("ticket", {
    action: "update",
    ticket
  });

  return ticket;
};

export default CreateTicketServiceWebhook;
