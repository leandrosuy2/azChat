import fs from "fs";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import TicketBudget from "../../models/TicketBudget";
import Contact from "../../models/Contact";
import SendWhatsAppMedia from "../WbotServices/SendWhatsAppMedia";
import formatBody from "../../helpers/Mustache";

const assertContactPhone = async (ticket: Ticket): Promise<void> => {
  if (!ticket.contactId) {
    throw new AppError("Nenhum contato vinculado ao ticket.", 400);
  }
  const c = await Contact.findByPk(ticket.contactId);
  if (!c) {
    throw new AppError("Contato não encontrado.", 400);
  }
  const digits = String(c.number || "").replace(/\D/g, "");
  const hasPhone = digits.length >= 10;
  /** Mesmo critério de SendWhatsAppMedia: usa remoteJid tal qual (incl. @lid). */
  const hasJid = Boolean(c.remoteJid) && String(c.remoteJid).includes("@");
  if (!hasPhone && !hasJid) {
    throw new AppError("Nenhum número vinculado ao contato.", 400);
  }
};

const buildCaption = (budget: TicketBudget, ticket: Ticket): string => {
  const raw = budget.payload?.client?.name?.trim() || "Cliente";
  const first = raw.split(/\s+/)[0];
  const text = `Olá, ${first}!\nSegue seu orçamento em PDF.\nQualquer dúvida estou à disposição.`;
  return formatBody(text, ticket);
};

interface Request {
  budget: TicketBudget;
  ticket: Ticket;
  file: Express.Multer.File;
}

const SendBudgetPdfWhatsAppService = async ({
  budget,
  ticket,
  file
}: Request): Promise<void> => {
  await assertContactPhone(ticket);
  if (!file?.path) {
    throw new AppError("Arquivo PDF ausente.", 400);
  }
  const caption = buildCaption(budget, ticket);
  const mimetype =
    file.mimetype && file.mimetype !== "application/octet-stream"
      ? file.mimetype
      : "application/pdf";
  const media = { ...file, mimetype };
  try {
    await SendWhatsAppMedia({
      media,
      ticket,
      body: caption,
      isPrivate: false,
      isForwarded: false
    });
  } finally {
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* ignore */
    }
  }
};

export default SendBudgetPdfWhatsAppService;
