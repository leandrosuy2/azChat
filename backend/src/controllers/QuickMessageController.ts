import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListService from "../services/QuickMessageService/ListService";
import CreateService from "../services/QuickMessageService/CreateService";
import ShowService from "../services/QuickMessageService/ShowService";
import UpdateService from "../services/QuickMessageService/UpdateService";
import DeleteService from "../services/QuickMessageService/DeleteService";
import FindService from "../services/QuickMessageService/FindService";
import IncrementUseService from "../services/QuickMessageService/IncrementUseService";

import QuickMessage from "../models/QuickMessage";
import { head } from "lodash";
import fs from "fs";
import path from "path";

import AppError from "../errors/AppError";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  userId: string | number;
};

type StoreData = {
  shortcode: string;
  message: string;
  userId: number | number;
  mediaPath?: string;
  mediaName?: string;
  /** JSON [{ path, name }, ...] — vários ficheiros por resposta rápida */
  attachments?: string | null;
  geral: boolean;
  isMedia: boolean;
  visao: boolean;
  category?: string | null;
  categoryColor?: string | null;
  isFavorite?: boolean;
  autoSend?: boolean;
  useInSlash?: boolean;
};

type AttachmentRow = { path: string; name: string };

const parseAttachmentsJson = (raw: unknown): AttachmentRow[] => {
  if (!raw || typeof raw !== "string") return [];
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    return j.filter(
      (x): x is AttachmentRow =>
        Boolean(x) && typeof (x as AttachmentRow).path === "string"
    );
  } catch {
    return [];
  }
};

type FindParams = {
  companyId: string;
  userId: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId, id: userId } = req.user;

  const { records, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId,
    userId
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body as StoreData;



  const schema = Yup.object().shape({
    shortcode: Yup.string().required(),
    message: data.isMedia ? Yup.string().notRequired() : Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const record = await CreateService({
    ...data,
    companyId,
    userId: req.user.id
  });

  const io = getIO();
  io.of(String(companyId))
  .emit(`company-${companyId}-quickmessage`, {
    action: "create",
    record
  });

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const record = await ShowService(id);

  return res.status(200).json(record);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body as StoreData;
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    shortcode: Yup.string().required(),
    message: data.isMedia ? Yup.string().notRequired() : Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { id } = req.params;

  const record = await UpdateService({
    ...data,
    userId: req.user.id,
    id,
  });

  const io = getIO();
  io.of(String(companyId))
  .emit(`company-${companyId}-quickmessage`, {
    action: "update",
    record
  });

  return res.status(200).json(record);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteService(id);

  const io = getIO();
  io.of(String(companyId))
  .emit(`company-${companyId}-quickmessage`, {
    action: "delete",
    id
  });

  return res.status(200).json({ message: "Contact deleted" });
};

export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const params = req.query as FindParams;
  const records: QuickMessage[] = await FindService(params);

  return res.status(200).json(records);
};

export const incrementUse = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const record = await IncrementUseService(id, companyId);

  return res.status(200).json({
    id: record.id,
    useCount: record.useCount
  });
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  try {
    const quickmessage = await QuickMessage.findByPk(id);
    if (!quickmessage) {
      throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
    }
    if (!file?.filename) {
      throw new AppError("Nenhum ficheiro enviado", 400);
    }

    const existing = parseAttachmentsJson(quickmessage.getDataValue("attachments"));
    const next: AttachmentRow[] = [
      ...existing,
      { path: file.filename, name: file.originalname || file.filename }
    ];

    await quickmessage.update({
      mediaPath: next[0].path,
      mediaName: next[0].name,
      attachments: JSON.stringify(next)
    });

    return res.send({ mensagem: "Arquivo Anexado" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  try {
    const quickmessage = await QuickMessage.findByPk(id);
    if (!quickmessage) {
      throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
    }

    const fromJson = parseAttachmentsJson(quickmessage.getDataValue("attachments"));
    const legacyPath = quickmessage.getDataValue("mediaPath") as string | null;
    const legacyName = quickmessage.getDataValue("mediaName") as string | null;
    const toRemove: AttachmentRow[] =
      fromJson.length > 0
        ? fromJson
        : legacyPath
          ? [{ path: legacyPath, name: legacyName || legacyPath }]
          : [];

    for (const row of toRemove) {
      const filePath = path.resolve(
        "public",
        `company${companyId}`,
        "quickMessage",
        row.path
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await quickmessage.update({
      mediaPath: null,
      mediaName: null,
      attachments: null
    });

    return res.send({ mensagem: "Arquivo Excluído" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};
