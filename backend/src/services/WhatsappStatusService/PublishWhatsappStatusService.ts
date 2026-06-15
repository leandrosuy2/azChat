import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import mime from "mime-types";
import * as Sentry from "@sentry/node";
import { Op } from "sequelize";
import { getWbot } from "../../libs/wbot";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import WhatsappStatusPublication from "../../models/WhatsappStatusPublication";
import logger from "../../utils/logger";

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

const DEFAULT_STATUS_BACKGROUND = "#1f2937";
const DEFAULT_STATUS_FONT = 1;
const STATUS_BROADCAST_JID = "status@broadcast";
const STATUS_CONFIRM_TIMEOUT_MS = 10000;

function makeStatusMessageId(): string {
  return `AZS${Date.now().toString(16).toUpperCase()}${randomBytes(8).toString("hex").toUpperCase()}`;
}

function getMediaPath(record: WhatsappStatusPublication): string | null {
  if (!record.mediaPath) return null;
  const candidates = [
    path.isAbsolute(record.mediaPath) ? record.mediaPath : "",
    path.join(publicFolder, record.mediaPath),
    path.join(publicFolder, `company${record.companyId}`, record.mediaPath)
  ].filter(Boolean);

  return candidates.find(candidate => fs.existsSync(candidate)) || candidates[candidates.length - 1];
}

function normalizePrivacyContactIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(item => Number(item)).filter(Number.isFinite)));
}

async function getStatusJidList(record: WhatsappStatusPublication): Promise<string[]> {
  const privacyMode = record.privacyMode || "contacts";
  const privacyContactIds = normalizePrivacyContactIds(record.privacyContactIds);
  const where: any = { companyId: record.companyId, active: true };

  if (privacyMode === "only") {
    if (privacyContactIds.length === 0) {
      throw new AppError("Selecione ao menos um contato para compartilhar o status.");
    }
    where.id = { [Op.in]: privacyContactIds };
  } else if (privacyMode === "except" && privacyContactIds.length > 0) {
    where.id = { [Op.notIn]: privacyContactIds };
  }

  const contacts = await Contact.findAll({
    attributes: ["id", "number", "remoteJid"],
    where
  });

  return Array.from(new Set(contacts
    .map(contact => {
      if (contact.remoteJid && String(contact.remoteJid).includes("@")) {
        return contact.remoteJid;
      }
      const digits = String(contact.number || "").replace(/\D/g, "");
      return digits ? `${digits}@s.whatsapp.net` : "";
    })
    .filter(jid => Boolean(jid) && String(jid).endsWith("@s.whatsapp.net"))));
}

function waitForStatusEcho(wbot: any, messageId: string): Promise<boolean> {
  return new Promise(resolve => {
    let done = false;
    let timer: NodeJS.Timeout | null = null;

    const finish = (value: boolean) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      wbot.ev.off("messages.upsert", handler);
      resolve(value);
    };

    const handler = (event: any) => {
      const messages = Array.isArray(event?.messages) ? event.messages : [];
      const found = messages.some((message: any) =>
        message?.key?.id === messageId &&
        message?.key?.fromMe === true &&
        message?.key?.remoteJid === STATUS_BROADCAST_JID
      );
      if (found) finish(true);
    };

    wbot.ev.on("messages.upsert", handler);
    timer = setTimeout(() => finish(false), STATUS_CONFIRM_TIMEOUT_MS);
  });
}

async function buildStatusMessage(record: WhatsappStatusPublication): Promise<any> {
  const body = record.body || "";
  const mediaPath = getMediaPath(record);

  if (record.contentType === "text" || !mediaPath) {
    return { text: body };
  }

  if (!fs.existsSync(mediaPath)) {
    throw new AppError("Arquivo de mídia do status não encontrado.");
  }

  const mimeType = mime.lookup(mediaPath) || record.mediaType || "";
  const mediaBuffer = fs.readFileSync(mediaPath);

  if (String(mimeType).startsWith("video/") || record.contentType === "video") {
    return {
      video: mediaBuffer,
      caption: body || undefined,
      mimetype: mimeType || undefined,
      fileName: record.mediaName || record.mediaPath
    };
  }

  return {
    image: mediaBuffer,
    caption: body || undefined,
    mimetype: mimeType || undefined
  };
}

const PublishWhatsappStatusService = async (
  publicationId: number
): Promise<WhatsappStatusPublication> => {
  const record = await WhatsappStatusPublication.findByPk(publicationId, {
    include: [{ model: Whatsapp, as: "whatsapp" }]
  });

  if (!record) {
    throw new AppError("Publicação de status não encontrada.", 404);
  }

  try {
    const whatsapp = record.whatsapp || await Whatsapp.findByPk(record.whatsappId);
    if (!whatsapp || whatsapp.companyId !== record.companyId) {
      throw new AppError("Conta WhatsApp inválida para esta publicação.");
    }
    if (whatsapp.status !== "CONNECTED") {
      throw new AppError("Conta WhatsApp não está conectada.");
    }

    if ((whatsapp.channel || "whatsapp") !== "whatsapp") {
      throw new AppError("Selecione uma conta do WhatsApp para publicar status.");
    }
    if (record.status === "publishing") {
      throw new AppError("Esta publicação já está em andamento.");
    }
    if (record.status === "published") {
      throw new AppError("Esta publicação já foi enviada.");
    }

    await record.update({
      status: "publishing",
      failureReason: null,
      audit: {
        ...(record.audit || {}),
        publishingAt: new Date().toISOString()
      }
    });

    const wbot = await getWbot(record.whatsappId);
    const statusJidList = await getStatusJidList(record);
    if (statusJidList.length === 0) {
      throw new AppError("Nenhum contato ativo encontrado para publicar o status.");
    }
    const message = await buildStatusMessage(record);
    logger.info(
      `[WhatsappStatus] publicando id=${record.id} whatsapp=${record.whatsappId} type=${record.contentType} privacy=${record.privacyMode || "contacts"} recipients=${statusJidList.length}`
    );

    const requestedMessageId = makeStatusMessageId();
    const statusEchoPromise = waitForStatusEcho(wbot, requestedMessageId);
    const sent = await wbot.sendMessage(STATUS_BROADCAST_JID, message, {
      messageId: requestedMessageId,
      backgroundColor: DEFAULT_STATUS_BACKGROUND,
      font: DEFAULT_STATUS_FONT,
      statusJidList,
      broadcast: true
    } as any);
    const messageId = sent?.key?.id || null;

    if (!messageId || sent?.key?.remoteJid !== STATUS_BROADCAST_JID || sent?.key?.fromMe !== true) {
      throw new AppError("WhatsApp nÃ£o confirmou a criaÃ§Ã£o da mensagem de Status.");
    }

    const confirmed = await statusEchoPromise;
    if (!confirmed) {
      throw new AppError("Status enviado ao WhatsApp, mas a publicaÃ§Ã£o nÃ£o foi confirmada pela instÃ¢ncia.");
    }

    await record.update({
      status: "published",
      publishedAt: new Date(),
      failureReason: null,
      recipientCount: statusJidList.length,
      whatsappMessageId: messageId,
      audit: {
        ...(record.audit || {}),
        publishedAt: new Date().toISOString(),
        whatsappMessageId: messageId,
        statusRemoteJid: sent.key.remoteJid,
        statusJidListCount: statusJidList.length,
        statusConfirmed: confirmed
      }
    });

    logger.info(`Status WhatsApp publicado id=${record.id} whatsapp=${record.whatsappId}`);
    return record;
  } catch (err: any) {
    Sentry.captureException(err);
    const message = err?.message || "Falha ao publicar status do WhatsApp.";
    await record.update({
      status: "failed",
      failureReason: message,
      audit: {
        ...(record.audit || {}),
        failedAt: new Date().toISOString(),
        failureReason: message
      }
    });
    logger.error(`Status WhatsApp falhou id=${record.id}: ${message}`);
    throw err;
  }
};

export default PublishWhatsappStatusService;
