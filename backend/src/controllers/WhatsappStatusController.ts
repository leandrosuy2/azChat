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
    if (dateTo) where.createdAt[Op.lte] = new Date(String(dateTo));
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

  const [byStatus, today, week, month] = await Promise.all([
    WhatsappStatusPublication.findAll({
      where: { companyId },
      attributes: ["status", [fn("COUNT", col("id")), "total"]],
      group: ["status"],
      raw: true
    }) as any,
    WhatsappStatusPublication.count({ where: { companyId, publishedAt: { [Op.gte]: startDay } } }),
    WhatsappStatusPublication.count({ where: { companyId, publishedAt: { [Op.gte]: startWeek } } }),
    WhatsappStatusPublication.count({ where: { companyId, publishedAt: { [Op.gte]: startMonth } } })
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
    month
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
    publishNow
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
    audit: {
      createdBy: userId,
      createdAt: new Date().toISOString()
    }
  } as any);

  emitStatus(companyId, "create", record);

  if (publishNow === "true" || publishNow === true) {
    const published = await PublishWhatsappStatusService(record.id);
    emitStatus(companyId, "update", published);
    return res.status(200).json(published);
  }

  return res.status(200).json(record);
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

  const { whatsappId, contentType, body, scheduledAt, status } = req.body;
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
    audit: {
      ...(record.audit || {}),
      updatedBy: userId,
      updatedAt: new Date().toISOString()
    }
  });

  emitStatus(companyId, "update", record);
  return res.status(200).json(record);
};

export const publish = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const record = await WhatsappStatusPublication.findOne({
    where: { id: req.params.id, companyId }
  });
  if (!record) throw new AppError("Publicação de status não encontrada.", 404);
  const published = await PublishWhatsappStatusService(record.id);
  emitStatus(companyId, "update", published);
  return res.status(200).json(published);
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
    audit: {
      createdBy: userId,
      duplicatedFrom: record.id,
      createdAt: new Date().toISOString()
    }
  } as any);

  emitStatus(companyId, "create", copy);
  return res.status(200).json(copy);
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

  emitStatus(companyId, "update", record);
  return res.status(200).json(record);
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
