import { WASocket } from "@whiskeysockets/baileys";
import AppError from "../errors/AppError";
import { getWbot } from "../libs/wbot";
import GetDefaultWhatsApp from "./GetDefaultWhatsApp";
import Whatsapp from "../models/Whatsapp";
import Ticket from "../models/Ticket";

type Session = WASocket & {
  id?: number;
};

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** Estados em que a sessão pode estar subindo na memória após restart do servidor. */
const WAPP_STATUS_MAY_BOOT = new Set([
  "CONNECTED",
  "OPENING",
  "qrcode",
  "PENDING"
]);

const POLL_MS = 300;
const MAX_WAIT_MS = 15_000;

const GetTicketWbot = async (ticket: Ticket): Promise<Session> => {
  if (!ticket.whatsappId) {
    const defaultWhatsapp = await GetDefaultWhatsApp(undefined, ticket.companyId);
    await ticket.update({ whatsappId: defaultWhatsapp.id });
  }

  const whatsappId = ticket.whatsappId as number;

  const tryOnce = (): Session => getWbot(whatsappId);

  try {
    return tryOnce();
  } catch (err) {
    if (!(err instanceof AppError) || err.message !== "ERR_WAPP_NOT_INITIALIZED") {
      throw err;
    }
  }

  const wpp = await Whatsapp.findByPk(whatsappId);
  if (!wpp || !WAPP_STATUS_MAY_BOOT.has(wpp.status)) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }

  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    try {
      return tryOnce();
    } catch (err) {
      if (!(err instanceof AppError) || err.message !== "ERR_WAPP_NOT_INITIALIZED") {
        throw err;
      }
    }
  }

  throw new AppError("ERR_WAPP_NOT_INITIALIZED");
};

export default GetTicketWbot;
