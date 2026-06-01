import { Request, Response } from "express";
import { Op } from "sequelize";
import { getIO } from "../libs/socket";

import AppError from "../errors/AppError";

import CreateService from "../services/TagServices/CreateService";
import ListService from "../services/TagServices/ListService";
import UpdateService from "../services/TagServices/UpdateService";
import ShowService from "../services/TagServices/ShowService";
import DeleteService from "../services/TagServices/DeleteService";
import SimpleListService from "../services/TagServices/SimpleListService";
import SyncTagService from "../services/TagServices/SyncTagsService";
import KanbanListService from "../services/TagServices/KanbanListService";
import InboxTagReorderService from "../services/TagServices/InboxTagReorderService";
import QuadroGroup from "../models/QuadroGroup";
import ContactTag from "../models/ContactTag";
import Contact from "../models/Contact";
import Tag from "../models/Tag";

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string | number;
  kanban?: number;
  tagId?: number;
  quadroGroupId?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber, searchParam, kanban, tagId, quadroGroupId } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { tags, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId,
    kanban,
    tagId,
    quadroGroupId:
      quadroGroupId != null && quadroGroupId !== ""
        ? Number(quadroGroupId)
        : undefined
  });

  return res.json({ tags, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, color, kanban,
    timeLane,
    nextLaneId,
    greetingMessageLane,
    rollbackLaneId,
    quadroGroupId: quadroGroupIdBody } = req.body;
  const { companyId } = req.user;

  const tag = await CreateService({
    name,
    color,
    kanban,
    companyId,
    timeLane,
    nextLaneId,
    greetingMessageLane,
    rollbackLaneId,
    quadroGroupId:
      quadroGroupIdBody != null && quadroGroupIdBody !== ""
        ? Number(quadroGroupIdBody)
        : undefined
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company${companyId}-tag`, {
      action: "create",
      tag
    });

  return res.status(200).json(tag);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { tagId } = req.params;

  const tag = await ShowService(tagId);

  return res.status(200).json(tag);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { kanban } = req.body;

  //console.log(kanban)
  if (req.user.profile !== "admin" && kanban === 1) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { tagId } = req.params;
  const tagData = req.body;
  const { companyId } = req.user;

  const tag = await UpdateService({ tagData, id: tagId });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company${companyId}-tag`, {
      action: "update",
      tag
    });

  return res.status(200).json(tag);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tagId } = req.params;
  const { companyId } = req.user;

  await DeleteService(tagId, companyId);

  const io = getIO();
  io.of(String(companyId))
    .emit(`company${companyId}-tag`, {
      action: "delete",
      tagId
    });

  return res.status(200).json({ message: "Tag deleted" });
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, kanban, quadroGroupId } = req.query as IndexQuery;
  const { companyId } = req.user;

  const tags = await SimpleListService({
    searchParam,
    kanban,
    companyId,
    quadroGroupId:
      quadroGroupId != null && quadroGroupId !== ""
        ? Number(quadroGroupId)
        : undefined
  });

  return res.json(tags);
};

export const inboxReorderTags = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { kanban, tagIds } = req.body as {
    kanban?: unknown;
    tagIds?: unknown;
  };
  if (!Array.isArray(tagIds)) {
    return res.status(400).json({ error: "tagIds deve ser um array" });
  }
  await InboxTagReorderService({
    companyId,
    kanban: Number(kanban),
    tagIds: tagIds as number[],
  });
  return res.status(200).json({ ok: true });
};

export const kanban = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const raw = req.query.quadroGroupId;
  if (raw == null || raw === "") {
    return res.status(400).json({ error: "quadroGroupId é obrigatório" });
  }
  const gid = Number(raw);
  if (Number.isNaN(gid)) {
    return res.status(400).json({ error: "quadroGroupId inválido" });
  }

  const tags = await KanbanListService({ companyId, quadroGroupId: gid });

  const group = await QuadroGroup.findOne({
    where: { id: gid, companyId },
    attributes: ["kanbanColumnOrderJson"]
  });
  const rawOrder = group?.kanbanColumnOrderJson;
  let lista = tags;
  if (rawOrder && String(rawOrder).trim()) {
    try {
      const order = JSON.parse(String(rawOrder)) as number[];
      if (Array.isArray(order) && order.length > 0) {
        const pos = (id: number) => {
          const i = order.indexOf(id);
          return i === -1 ? 99999 : i;
        };
        lista = [...tags].sort((a, b) => pos(a.id) - pos(b.id));
      }
    } catch {
      /* mantém ordem padrão */
    }
  }

  return res.json({ lista });
};

export const kanbanReorderTags = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { tagIds, quadroGroupId } = req.body as {
    tagIds?: unknown;
    quadroGroupId?: string | number;
  };
  const gid =
    quadroGroupId != null && quadroGroupId !== ""
      ? Number(quadroGroupId)
      : NaN;
  if (Number.isNaN(gid)) {
    return res.status(400).json({ error: "quadroGroupId é obrigatório" });
  }
  if (!Array.isArray(tagIds)) {
    return res.status(400).json({ error: "tagIds deve ser um array" });
  }
  const group = await QuadroGroup.findOne({ where: { id: gid, companyId } });
  if (!group) {
    return res.status(404).json({ error: "Área de trabalho não encontrada" });
  }
  const nums = tagIds
    .map((x) => Number(x))
    .filter((n) => !Number.isNaN(n));
  await group.update({
    kanbanColumnOrderJson: JSON.stringify(nums)
  });
  return res.status(200).json({ ok: true });
};

export const syncTags = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body;
  const { companyId } = req.user;

  const tags = await SyncTagService({ ...data, companyId });

  return res.json(tags);
};

export const addContactTagLink = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId, tagId } = req.params;
  const { companyId } = req.user;

  const contact = await Contact.findOne({
    where: { id: Number(contactId), companyId }
  });
  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  const tag = await Tag.findOne({
    where: { id: Number(tagId), companyId }
  });
  if (!tag) {
    throw new AppError("ERR_NO_TAG_FOUND", 404);
  }

  if (Number(tag.kanban) === 2) {
    const funnelTags = await Tag.findAll({
      where: { companyId, kanban: 2 },
      attributes: ["id"]
    });
    const funnelTagIds = funnelTags.map(funnelTag => funnelTag.id);
    if (funnelTagIds.length > 0) {
      await ContactTag.destroy({
        where: {
          contactId: Number(contactId),
          tagId: {
            [Op.in]: funnelTagIds,
            [Op.ne]: Number(tagId)
          }
        }
      });
    }
  }

  await ContactTag.findOrCreate({
    where: { contactId: Number(contactId), tagId: Number(tagId) }
  });

  const updatedContact = await Contact.findOne({
    where: { id: Number(contactId), companyId },
    include: ["extraInfo", "tags"]
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-contact`, {
    action: "update",
    contact: updatedContact || contact
  });

  return res.status(200).json({ ok: true, contact: updatedContact || contact });
};

export const removeContactTag = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tagId, contactId } = req.params;
  const { companyId } = req.user;

  await ContactTag.destroy({
    where: {
      tagId,
      contactId
    }
  });

  const tag = await ShowService(tagId);
  const contact = await Contact.findOne({
    where: { id: Number(contactId), companyId },
    include: ["extraInfo", "tags"]
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company${companyId}-tag`, {
      action: "update",
      tag
    });
  if (contact) {
    io.of(String(companyId)).emit(`company-${companyId}-contact`, {
      action: "update",
      contact
    });
  }

  return res.status(200).json({ message: "Tag deleted", contact });
};
