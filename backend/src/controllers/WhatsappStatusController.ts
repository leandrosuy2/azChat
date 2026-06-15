import { Request, Response } from "express";
import { head } from "lodash";
import { Op, fn, col } from "sequelize";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import WhatsappStatusPublication from "../models/WhatsappStatusPublication";
import User from "../models/User";
import PublishWhatsappStatusService from "../services/WhatsappStatusService/PublishWhatsappStatusService";

type IndexQuery = {
  searchParam?: string;
  status?: string;
  whatsappId?: string | number;
  dateFrom?: string;
  dateTo?: string;
};

function emitStatus(companyId: number, action: string, record: WhatsappStatusPublication) {
  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-whatsapp-status`, {
    action,
    record
  });
}

async function reloadRecord(id: number, companyId: number): Promise<WhatsappStatusPublication | null> {
  return WhatsappStatusPublication.findOne({
    where: { id, companyId },
    include: [
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name", "status", "channel"] },
      { model: User, as: "user", attributes: ["id", "name"] }
    ]
  });
}

function normalizeContentType(contentType: string, mediaType?: string): string {
  if (contentType === "image" || contentType === "video" || contentType === "text") {
    return contentType;
  }
  if (mediaType?.startsWith("image/")) return "image";
  if (mediaType?.startsWith("video/")) return "video";
  return "text";
}

function assertSchedule(status: string, scheduledAt?: string | Date) {
  if (status === "scheduled" && !scheduledAt) {
    throw new AppError("Informe data e horário para agendar a publicação.");
  }
}

function normalizePrivacyMode(value: unknown): string {
  const mode = String(value || "contacts");
  return ["contacts", "except", "only"].includes(mode) ? mode : "contacts";
}

function parsePrivacyContactIds(value: unknown): number[] {
  if (!value) return [];
  const raw = typeof value === "string" ? JSON.parse(value || "[]") : value;
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.map(item => Number(item)).filter(Number.isFinite)));
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, status, whatsappId, dateFrom, dateTo } = req.query as IndexQuery;

  const where: any = { companyId };

  if (status && status !== "all") where.status = status;
  if (whatsappId && whatsappId !== "all") where.whatsappId = Number(whatsappId);
  if (searchParam) {
    where[Op.or] = [
      { body: { [Op.iLike]: `%${searchParam}%` } },
      { mediaName: { [Op.iLike]: `%${searchParam}%` } }
    ];
  }
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt[Op.gte] = new Date(String(dateFrom));
    if (dateTo) {
      const end = new Date(String(dateTo));
      end.setHours(23, 59, 59, 999);
      where.createdAt[Op.lte] = end;
    }
  }

  const records = await WhatsappStatusPublication.findAll({
    where,
    include: [
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name", "status", "channel"] },
      { model: User, as: "user", attributes: ["id", "name"] }
    ],
    order: [["createdAt", "DESC"]],
    limit: 200
  });

  return res.status(200).json({ records });
};

export const stats = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(startDay);
  startWeek.setDate(startWeek.getDate() - startWeek.getDay());
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [byStatus, today, week, month, recipientTotal] = await Promise.all([
    WhatsappStatusPublication.findAll({
      where: { companyId },
      attributes: ["status", [fn("COUNT", col("id")), "total"]],
      group: ["status"],
      raw: true
    }) as any,
    WhatsappStatusPublication.count({ where: { companyId, status: "published", publishedAt: { [Op.gte]: startDay } } }),
    WhatsappStatusPublication.count({ where: { companyId, status: "published", publishedAt: { [Op.gte]: startWeek } } }),
    WhatsappStatusPublication.count({ where: { companyId, status: "published", publishedAt: { [Op.gte]: startMonth } } }),
    WhatsappStatusPublication.sum("recipientCount", { where: { companyId, status: "published" } })
  ]);

  const totals = {
    published: 0,
    scheduled: 0,
    failed: 0,
    draft: 0,
    canceled: 0,
    publishing: 0,
    today,
    week,
    month,
    views: 0,
    recipientTotal: Number(recipientTotal || 0)
  };

  byStatus.forEach((item: any) => {
    totals[item.status] = Number(item.total || 0);
  });

  return res.status(200).json(totals);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userIdRaw } = req.user;
  const userId = Number(userIdRaw);
  const files = req.files as Express.Multer.File[];
  const file = head(files);
  const {
    whatsappId,
    contentType,
    body,
    scheduledAt,
    publishNow,
    privacyMode,
    privacyContactIds
  } = req.body;

  const nextStatus = publishNow === "true" || publishNow === true ? "draft" : "scheduled";
  assertSchedule(nextStatus, scheduledAt);

  const normalizedType = normalizeContentType(contentType, file?.mimetype);
  if (normalizedType === "text" && !String(body || "").trim()) {
    throw new AppError("Informe o texto do status.");
  }
  if ((normalizedType === "image" || normalizedType === "video") && !file) {
    throw new AppError("Envie a imagem ou vídeo do status.");
  }

  const record = await WhatsappStatusPublication.create({
    companyId,
    userId,
    whatsappId: Number(whatsappId),
    contentType: normalizedType,
    body: body || "",
    mediaPath: file?.filename || null,
    mediaName: file?.originalname || null,
    mediaType: file?.mimetype || null,
    status: nextStatus,
    scheduledAt: nextStatus === "scheduled" ? new Date(scheduledAt) : null,
    privacyMode: normalizePrivacyMode(privacyMode),
    privacyContactIds: parsePrivacyContactIds(privacyContactIds),
    recipientCount: 0,
    audit: {
      createdBy: userId,
      createdAt: new Date().toISOString()
    }
  } as any);

  const created = await reloadRecord(record.id, companyId);
  emitStatus(companyId, "create", created || record);

  if (publishNow === "true" || publishNow === true) {
    const published = await PublishWhatsappStatusService(record.id);
    const full = await reloadRecord(published.id, companyId);
    emitStatus(companyId, "update", full || published);
    return res.status(200).json(full || published);
  }

  return res.status(200).json(created || record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userIdRaw } = req.user;
  const userId = Number(userIdRaw);
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];
  const file = head(files);
  const record = await WhatsappStatusPublication.findOne({ where: { id, companyId } });

  if (!record) throw new AppError("Publicação de status não encontrada.", 404);
  if (["published", "publishing"].includes(record.status)) {
    throw new AppError("Não é possível editar uma publicação já enviada.");
  }

  const { whatsappId, contentType, body, scheduledAt, status, privacyMode, privacyContactIds } = req.body;
  const normalizedType = normalizeContentType(contentType || record.contentType, file?.mimetype || record.mediaType);
  const nextStatus = status || record.status;
  assertSchedule(nextStatus, scheduledAt || record.scheduledAt);

  await record.update({
    whatsappId: whatsappId ? Number(whatsappId) : record.whatsappId,
    contentType: normalizedType,
    body: body != null ? body : record.body,
    mediaPath: file?.filename || record.mediaPath,
    mediaName: file?.originalname || record.mediaName,
    mediaType: file?.mimetype || record.mediaType,
    status: nextStatus,
    scheduledAt: nextStatus === "scheduled"
      ? new Date(scheduledAt || record.scheduledAt)
      : null,
    privacyMode: privacyMode != null ? normalizePrivacyMode(privacyMode) : record.privacyMode,
    privacyContactIds: privacyContactIds != null
      ? parsePrivacyContactIds(privacyContactIds)
      : record.privacyContactIds,
    audit: {
      ...(record.audit || {}),
      updatedBy: userId,
      updatedAt: new Date().toISOString()
    }
  });

  const full = await reloadRecord(record.id, companyId);
  emitStatus(companyId, "update", full || record);
  return res.status(200).json(full || record);
};

export const publish = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const record = await WhatsappStatusPublication.findOne({
    where: { id: req.params.id, companyId }
  });
  if (!record) throw new AppError("Publicação de status não encontrada.", 404);
  const published = await PublishWhatsappStatusService(record.id);
  const full = await reloadRecord(published.id, companyId);
  emitStatus(companyId, "update", full || published);
  return res.status(200).json(full || published);
};

export const duplicate = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userIdRaw } = req.user;
  const userId = Number(userIdRaw);
  const record = await WhatsappStatusPublication.findOne({
    where: { id: req.params.id, companyId }
  });
  if (!record) throw new AppError("Publicação de status não encontrada.", 404);

  const copy = await WhatsappStatusPublication.create({
    companyId,
    userId,
    whatsappId: record.whatsappId,
    contentType: record.contentType,
    body: record.body,
    mediaPath: record.mediaPath,
    mediaName: record.mediaName,
    mediaType: record.mediaType,
    status: "draft",
    privacyMode: record.privacyMode,
    privacyContactIds: record.privacyContactIds,
    recipientCount: 0,
    audit: {
      createdBy: userId,
      duplicatedFrom: record.id,
      createdAt: new Date().toISOString()
    }
  } as any);

  const full = await reloadRecord(copy.id, companyId);
  emitStatus(companyId, "create", full || copy);
  return res.status(200).json(full || copy);
};

export const cancel = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userIdRaw } = req.user;
  const userId = Number(userIdRaw);
  const record = await WhatsappStatusPublication.findOne({
    where: { id: req.params.id, companyId }
  });
  if (!record) throw new AppError("Publicação de status não encontrada.", 404);
  if (record.status !== "scheduled") throw new AppError("Somente agendamentos podem ser cancelados.");

  await record.update({
    status: "canceled",
    audit: {
      ...(record.audit || {}),
      canceledBy: userId,
      canceledAt: new Date().toISOString()
    }
  });

  const full = await reloadRecord(record.id, companyId);
  emitStatus(companyId, "update", full || record);
  return res.status(200).json(full || record);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const record = await WhatsappStatusPublication.findOne({
    where: { id: req.params.id, companyId }
  });
  if (!record) throw new AppError("Publicação de status não encontrada.", 404);
  await record.destroy();
  emitStatus(companyId, "delete", record);
  return res.status(200).json({ message: "Status removido" });
};
