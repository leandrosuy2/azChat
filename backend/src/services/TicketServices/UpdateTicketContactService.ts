import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";
import ShowTicketService from "./ShowTicketService";

const UpdateTicketContactService = async (
  ticketId: string | number,
  companyId: number,
  contactId: number
): Promise<Ticket> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id", "contactId", "companyId"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const contact = await Contact.findOne({
    where: { id: contactId, companyId },
    attributes: ["id"]
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  await ticket.update({ contactId });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
    action: "update",
    ticket: await ShowTicketService(ticketId, companyId)
  });

  return ShowTicketService(ticketId, companyId);
};

export default UpdateTicketContactService;
