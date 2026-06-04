import fs from "fs";
import path from "path";
import mime from "mime-types";
import * as Sentry from "@sentry/node";
import { getWbot } from "../../libs/wbot";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import WhatsappStatusPublication from "../../models/WhatsappStatusPublication";
import logger from "../../utils/logger";

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

const DEFAULT_STATUS_BACKGROUND = "#1f2937";
const DEFAULT_STATUS_FONT = 1;

function getMediaPath(record: WhatsappStatusPublication): string | null {
  if (!record.mediaPath) return null;
  return path.join(publicFolder, `company${record.companyId}`, record.mediaPath);
}

async function getStatusJidList(companyId: number): Promise<string[]> {
  const contacts = await Contact.findAll({
    attributes: ["number", "remoteJid"],
    where: { companyId, active: true }
  });

  return contacts
    .map(contact => {
      if (contact.remoteJid && String(contact.remoteJid).includes("@")) {
        return contact.remoteJid;
      }
      const digits = String(contact.number || "").replace(/\D/g, "");
      return digits ? `${digits}@s.whatsapp.net` : "";
    })
    .filter(Boolean);
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

    await record.update({
      status: "publishing",
      failureReason: null,
      audit: {
        ...(record.audit || {}),
        publishingAt: new Date().toISOString()
      }
    });

    const wbot = await getWbot(record.whatsappId);
    const statusJidList = await getStatusJidList(record.companyId);
    const message = await buildStatusMessage(record);

    const sent = await wbot.sendMessage("status@broadcast", message, {
      backgroundColor: DEFAULT_STATUS_BACKGROUND,
      font: DEFAULT_STATUS_FONT,
      statusJidList
    } as any);

    await record.update({
      status: "published",
      publishedAt: new Date(),
      failureReason: null,
      audit: {
        ...(record.audit || {}),
        publishedAt: new Date().toISOString(),
        whatsappMessageId: sent?.key?.id || null,
        statusJidListCount: statusJidList.length
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
