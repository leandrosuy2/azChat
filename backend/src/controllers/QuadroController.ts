import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import {
  sanitizeProcessoDetalhesItensInput
} from "../helpers/ProcessoDetalhesItens";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import GetQuadroByTicketUuidService, {
  mapQuadroRowForView
} from "../services/QuadroServices/GetQuadroByTicketUuidService";
import {
  batchFetchUnlinkedMirrorByQuadroId,
  isUnlinkedMirrorView,
  parseViewQuadroGroupId
} from "../helpers/UnlinkedMirrorQuadro";
import UpdateQuadroStatusService from "../services/QuadroServices/UpdateQuadroStatusService";
import UpdateQuadroDescriptionService from "../services/QuadroServices/UpdateQuadroDescriptionService";
import UploadQuadroAttachmentService from "../services/QuadroServices/UploadQuadroAttachmentService";
import SetQuadroAttachmentCapaService from "../services/QuadroServices/SetQuadroAttachmentCapaService";
import DeleteQuadroAttachmentService from "../services/QuadroServices/DeleteQuadroAttachmentService";
import RenameQuadroAttachmentService from "../services/QuadroServices/RenameQuadroAttachmentService";
import UpdateQuadroAttachmentMetaService from "../services/QuadroServices/UpdateQuadroAttachmentMetaService";
import { quadroAttachmentPublicUrl } from "../helpers/QuadroAttachmentPaths";
import CreateQuadroLogService from "../services/QuadroServices/CreateQuadroLogService";
import ListQuadroLogsService from "../services/QuadroServices/ListQuadroLogsService";
import UpdateQuadroValuesService from "../services/QuadroServices/UpdateQuadroValuesService";
import ShareTicketQuadroService from "../services/QuadroServices/ShareTicketQuadroService";
import MoveTicketQuadroService from "../services/QuadroServices/MoveTicketQuadroService";
import UpdateMirrorKanbanLaneService from "../services/QuadroServices/UpdateMirrorKanbanLaneService";
import DispatchKanbanLembreteService from "../services/TicketLembreteServices/DispatchKanbanLembreteService";
import TicketQuadro from "../models/TicketQuadro";
import QuadroGroup from "../models/QuadroGroup";

/** Dispara o mesmo evento do UpdateTicketService para o Kanban/chat atualizarem. */
const emitTicketUpdateForKanban = async (
  ticketId: number,
  companyId: number
): Promise<void> => {
  try {
    const ticket = await ShowTicketService(ticketId, companyId);
    getIO().of(String(companyId)).emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });
  } catch {
    /* noop */
  }
};

const emitKanbanCardsRefresh = (companyId: number): void => {
  getIO().of(String(companyId)).emit(`company-${companyId}-ticket`, {
    action: "update",
    ticket: { id: 0 }
  });
};

export const getQuadro = async (req: Request, res: Response): Promise<Response> => {
  const { ticketUuid } = req.params;
  const { companyId } = req.user;
  const viewGid = parseViewQuadroGroupId((req.query as { viewQuadroGroupId?: unknown }).viewQuadroGroupId);
  const data = await GetQuadroByTicketUuidService(ticketUuid, companyId, viewGid);
  return res.status(200).json(data);
};

export const updateStatus = async (req: Request, res: Response): Promise<Response> => {
  const { ticketUuid } = req.params;
  const { companyId } = req.user;
  const { status, viewQuadroGroupId: viewRaw } = req.body;
  const viewGid = parseViewQuadroGroupId(viewRaw);
  const quadro = await UpdateQuadroStatusService(ticketUuid, companyId, status, viewGid);
  await quadro.reload();
  if (quadro.ticketId) {
    const skipLembrete = viewGid != null && isUnlinkedMirrorView(quadro, viewGid);
    if (!skipLembrete) {
      try {
        await DispatchKanbanLembreteService(quadro.ticketId, companyId, {
          tipo: "mudanca_status",
          status: quadro.status
        });
      } catch (e) {
        console.error("[updateStatus kanban lembrete]", e);
      }
    }
    await emitTicketUpdateForKanban(quadro.ticketId, companyId);
  } else {
    emitKanbanCardsRefresh(companyId);
  }
  const ul = await batchFetchUnlinkedMirrorByQuadroId([quadro.id], companyId);
  const payload = mapQuadroRowForView(quadro, viewGid, ul[quadro.id]);
  return res.status(200).json({
    quadro: {
      ticketId: payload.ticketId,
      status: payload.status,
      description: payload.description,
      valorServico: payload.valorServico != null ? Number(payload.valorServico) : null,
      valorEntrada: payload.valorEntrada != null ? Number(payload.valorEntrada) : null,
      updatedAt: payload.updatedAt
    }
  });
};

export const updateDescription = async (req: Request, res: Response): Promise<Response> => {
  const { ticketUuid } = req.params;
  const { companyId } = req.user;
  const { description, viewQuadroGroupId: viewRaw } = req.body;
  const viewGid = parseViewQuadroGroupId(viewRaw);
  const quadro = await UpdateQuadroDescriptionService(ticketUuid, companyId, description, viewGid);
  await quadro.reload();
  if (quadro.ticketId) {
    await emitTicketUpdateForKanban(quadro.ticketId, companyId);
  } else {
    emitKanbanCardsRefresh(companyId);
  }
  const ulDesc = await batchFetchUnlinkedMirrorByQuadroId([quadro.id], companyId);
  const payload = mapQuadroRowForView(quadro, viewGid, ulDesc[quadro.id]);
  return res.status(200).json({
    quadro: {
      ticketId: payload.ticketId,
      status: payload.status,
      description: payload.description,
      valorServico: payload.valorServico != null ? Number(payload.valorServico) : null,
      valorEntrada: payload.valorEntrada != null ? Number(payload.valorEntrada) : null,
      updatedAt: payload.updatedAt
    }
  });
};

export const uploadAttachment = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const file = req.file;
  if (!file || !file.filename) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }
  if (!file.size || file.size < 1) {
    return res.status(400).json({ error: "Arquivo vazio. Selecione a imagem de novo e envie." });
  }
  const ticketIdRaw = (req as any).ticketIdQuadro as number | null | undefined;
  const ticketQuadroIdRaw = (req as any).ticketQuadroIdQuadro as number | null | undefined;
  const rawBloco = (req.body as { processoBlocoId?: string })?.processoBlocoId;
  const processoBlocoId =
    rawBloco != null && String(rawBloco).trim() !== ""
      ? String(rawBloco).trim().slice(0, 36)
      : null;
  try {
    const attachment = await UploadQuadroAttachmentService({
      companyId,
      filename: file.filename,
      ticketId: ticketIdRaw != null && Number(ticketIdRaw) > 0 ? Number(ticketIdRaw) : null,
      ticketQuadroId:
        ticketQuadroIdRaw != null && Number(ticketQuadroIdRaw) > 0 ? Number(ticketQuadroIdRaw) : null,
      processoBlocoId
    });
    const tidNum = ticketIdRaw != null && Number(ticketIdRaw) > 0 ? Number(ticketIdRaw) : 0;
    if (tidNum > 0) {
      try {
        await DispatchKanbanLembreteService(tidNum, companyId, {
          tipo: "anexo_adicionado",
          nomeArquivo: file.originalname || file.filename || "anexo"
        });
      } catch (le) {
        console.error("[uploadAttachment kanban lembrete anexo]", le);
      }
    }
    return res.status(201).json({ attachment });
  } catch (err) {
    console.error("[quadro/uploadAttachment]", err);
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    const anyErr = err as Error & {
      parent?: { detail?: string; code?: string };
      original?: { detail?: string; code?: string };
    };
    const pgDetail = anyErr.parent?.detail || anyErr.original?.detail;
    const looksSchema =
      err instanceof Error &&
      /notNullViolation|null value|column .* does not exist/i.test(err.message);
    const msg = looksSchema
      ? "Schema do banco incompatível com anexos do quadro (veja campo detail). Rode migrations ou: node scripts/repair-ticket-quadro-anexos-processo-legenda.js e, se for quadro sem ticket, acrescente --ticketid-null"
      : "Erro ao gravar anexo no servidor.";
    return res.status(500).json({
      error: msg,
      ...(pgDetail ? { detail: String(pgDetail) } : {}),
      ...((anyErr.parent?.code || anyErr.original?.code)
        ? { code: String(anyErr.parent?.code || anyErr.original?.code) }
        : {})
    });
  }
};

export const setAttachmentCapa = async (req: Request, res: Response): Promise<Response> => {
  const { ticketUuid, attachmentId } = req.params;
  const { companyId } = req.user;
  const attachments = await SetQuadroAttachmentCapaService(
    ticketUuid,
    companyId,
    parseInt(attachmentId, 10)
  );
  return res.status(200).json({ attachments });
};

export const updateAttachmentMeta = async (req: Request, res: Response): Promise<Response> => {
  const { ticketUuid, attachmentId } = req.params;
  const { companyId } = req.user;
  const { legenda, processoBlocoId } = req.body as {
    legenda?: string | null;
    processoBlocoId?: string | null;
  };
  const attachment = await UpdateQuadroAttachmentMetaService({
    ticketUuid,
    companyId,
    attachmentId: parseInt(attachmentId, 10),
    legenda:
      legenda === undefined
        ? undefined
        : legenda === null
          ? ""
          : String(legenda),
    processoBlocoId:
      processoBlocoId === undefined
        ? undefined
        : processoBlocoId === null
          ? null
          : String(processoBlocoId).trim() === ""
            ? null
            : String(processoBlocoId).trim().slice(0, 36)
  });
  const url = quadroAttachmentPublicUrl(companyId, attachment.path, {
    ticketId:
      attachment.ticketId != null && Number(attachment.ticketId) > 0 ? Number(attachment.ticketId) : null,
    ticketQuadroId:
      attachment.ticketQuadroId != null && Number(attachment.ticketQuadroId) > 0
        ? Number(attachment.ticketQuadroId)
        : null
  });
  return res.status(200).json({
    attachment: {
      id: attachment.id,
      name: attachment.name,
      url,
      isCapa: attachment.isCapa,
      createdAt: attachment.createdAt,
      processoBlocoId: attachment.processoBlocoId ?? null,
      legenda: attachment.legenda ?? null
    }
  });
};

export const deleteAttachment = async (req: Request, res: Response): Promise<Response> => {
  const ticketUuidOrId = req.params.ticketUuid ?? req.params.ticketId;
  const { attachmentId } = req.params;
  const { companyId } = req.user;
  await DeleteQuadroAttachmentService(ticketUuidOrId, companyId, parseInt(attachmentId, 10));
  return res.status(204).send();
};

export const renameAttachment = async (req: Request, res: Response): Promise<Response> => {
  const ticketUuidOrId = req.params.ticketId ?? req.params.ticketUuid;
  const { attachmentId } = req.params;
  const { companyId } = req.user;
  const { name } = req.body;
  if (name == null || String(name).trim() === "") {
    return res.status(400).json({ error: "name é obrigatório" });
  }
  const attachment = await RenameQuadroAttachmentService(
    ticketUuidOrId,
    companyId,
    parseInt(attachmentId, 10),
    name
  );
  const baseUrl = `${process.env.BACKEND_URL}${process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""}`;
  const url =
    attachment.ticketId != null && Number(attachment.ticketId) > 0
      ? `${baseUrl}/public/company${companyId}/quadro/${attachment.ticketId}/${attachment.path}`
      : `${baseUrl}/public/company${companyId}/quadro-standalone/${attachment.ticketQuadroId}/${attachment.path}`;
  return res.status(200).json({
    attachment: {
      id: attachment.id,
      name: attachment.name,
      url,
      isCapa: attachment.isCapa,
      createdAt: attachment.createdAt
    }
  });
};

export const createLog = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId, id: userId } = req.user;
  const { fromLaneId, toLaneId, fromLabel, toLabel } = req.body;
  const ticketIdNum = parseInt(ticketId, 10);
  const log = await CreateQuadroLogService({
    ticketId: ticketIdNum,
    companyId,
    userId: Number(userId),
    fromLaneId,
    toLaneId,
    fromLabel,
    toLabel
  });
  try {
    const ticket = await ShowTicketService(ticketIdNum, companyId);
    const quadro = await TicketQuadro.findOne({
      where: { ticketId: ticketIdNum },
      attributes: ["nomeProjeto", "quadroGroupId"],
      include: [{ model: QuadroGroup, attributes: ["name"], required: false }]
    });
    const userName = (req.user as any).name || "Sistema";
    getIO().of(String(companyId)).to("notification").emit(`company-${companyId}-system-notification`, {
      id: `kanban-move-${log.id}`,
      kind: "kanban_move",
      kindLabel: "Kanban",
      title: "Cartão movido no Kanban",
      body: `${userName} moveu o cartão de ${fromLabel || "Sem etapa"} para ${toLabel || "Sem etapa"}.`,
      createdAt: log.createdAt,
      ticketId: ticket.id,
      ticketUuid: ticket.uuid,
      logId: log.id,
      clientName: ticket.contact?.name || null,
      boardName: (quadro as any)?.group?.name || null,
      cardName: quadro?.nomeProjeto || null,
      fromLabel: fromLabel || null,
      toLabel: toLabel || null,
      userName,
      status: "ok"
    });
  } catch {
    /* Mantém o log mesmo se a notificação em tempo real falhar. */
  }
  return res.status(200).json({ ok: true });
};

export const updateValues = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const {
    valorServico,
    valorEntrada,
    nomeProjeto,
    customFields,
    detalhesProcesso,
    detalhesProcessoItens,
    dataPrazo,
    viewQuadroGroupId: viewRaw
  } = req.body;
  const viewGid = parseViewQuadroGroupId(viewRaw);
  const valorServicoNum = valorServico != null ? Number(valorServico) : null;
  const valorEntradaNum = valorEntrada != null ? Number(valorEntrada) : null;
  const detalhesProcessoVal =
    detalhesProcesso === undefined
      ? undefined
      : detalhesProcesso === null
        ? null
        : String(detalhesProcesso);
  const itensParsed = sanitizeProcessoDetalhesItensInput(detalhesProcessoItens);
  if (detalhesProcessoItens !== undefined && itensParsed === undefined) {
    return res.status(400).json({
      error:
        "detalhesProcessoItens deve ser um array de { id?, titulo, descricao, campos?: [{ id?, nome, valor }] }"
    });
  }
  const dataPrazoVal =
    dataPrazo === undefined ? undefined : dataPrazo === null ? null : String(dataPrazo).trim() || null;

  const quadro = await UpdateQuadroValuesService(
    String(ticketId),
    companyId,
    valorServicoNum,
    valorEntradaNum,
    nomeProjeto,
    detalhesProcessoVal,
    customFields,
    itensParsed === undefined ? undefined : itensParsed,
    dataPrazoVal,
    viewGid
  );
  await quadro.reload();
  if (quadro.ticketId) {
    await emitTicketUpdateForKanban(quadro.ticketId, companyId);
  } else {
    emitKanbanCardsRefresh(companyId);
  }
  const ulVal = await batchFetchUnlinkedMirrorByQuadroId([quadro.id], companyId);
  const payload = mapQuadroRowForView(quadro, viewGid, ulVal[quadro.id]);
  return res.status(200).json({
    quadro: {
      ticketId: payload.ticketId,
      status: payload.status,
      description: payload.description,
      valorServico: payload.valorServico != null ? Number(payload.valorServico) : null,
      valorEntrada: payload.valorEntrada != null ? Number(payload.valorEntrada) : null,
      nomeProjeto: payload.nomeProjeto ?? null,
      dataPrazo: payload.dataPrazo ?? null,
      detalhesProcesso: payload.detalhesProcesso ?? null,
      detalhesProcessoItens: payload.detalhesProcessoItens ?? [],
      customFields: payload.customFields ?? [],
      quadroGroupId: payload.quadroGroupId ?? null,
      sharedGroupIds: payload.sharedGroupIds ?? [],
      updatedAt: payload.updatedAt
    }
  });
};

export const move = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const { targetGroupId, targetTagId, userId } = req.body;
  if (targetGroupId == null) {
    return res.status(400).json({ error: "targetGroupId é obrigatório" });
  }
  const { ticket, quadro } = await MoveTicketQuadroService({
    ticketId: parseInt(ticketId, 10),
    companyId,
    targetGroupId: Number(targetGroupId),
    targetTagId: targetTagId != null ? Number(targetTagId) : undefined,
    userId: userId != null ? Number(userId) : undefined
  });
  if (ticket) {
    await emitTicketUpdateForKanban(ticket.id, companyId);
  } else {
    emitKanbanCardsRefresh(companyId);
  }
  return res.status(200).json({
    ticket: ticket
      ? {
          id: ticket.id,
          quadroGroupId: ticket.quadroGroupId,
          userId: ticket.userId
        }
      : {
          id: -quadro.id,
          quadroGroupId: quadro.quadroGroupId,
          userId: null,
          isStandaloneQuadro: true
        },
    quadro: {
      ticketId: quadro.ticketId,
      quadroGroupId: quadro.quadroGroupId,
      sharedGroupIds: quadro.sharedGroupIds ?? [],
      status: quadro.status,
      updatedAt: quadro.updatedAt
    }
  });
};

/** Coluna no Kanban quando o cartão é espelho nesta área (só atualiza sharedStagesByGroup). */
export const updateMirrorKanbanLane = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const { quadroGroupId, tagId } = req.body;

  const tid = parseInt(String(ticketId), 10);
  if (Number.isNaN(tid)) {
    return res.status(400).json({ error: "ticketId inválido" });
  }
  const qgid = quadroGroupId != null ? Number(quadroGroupId) : NaN;
  if (!Number.isFinite(qgid)) {
    return res.status(400).json({ error: "quadroGroupId inválido" });
  }
  let stage: number | null = null;
  if (tagId !== undefined && tagId !== null && tagId !== "") {
    const n = Number(tagId);
    if (!Number.isFinite(n)) {
      return res.status(400).json({ error: "tagId inválido" });
    }
    stage = n;
  }

  try {
    const quadro = await UpdateMirrorKanbanLaneService({
      ticketId: tid,
      companyId,
      mirrorGroupId: qgid,
      stageTagId: stage
    });
    if (quadro.ticketId != null) {
      await emitTicketUpdateForKanban(quadro.ticketId, companyId);
    } else {
      emitKanbanCardsRefresh(companyId);
    }
    return res.status(200).json({
      sharedStagesByGroup: quadro.sharedStagesByGroup ?? {}
    });
  } catch (err) {
    console.error("[quadro/updateMirrorKanbanLane]", err);
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: "Erro ao mover coluna (espelho)." });
  }
};

export const share = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const { groupIds, linkType, sharedStagesByGroup } = req.body;
  if (!Array.isArray(groupIds)) {
    return res.status(400).json({ error: "groupIds é obrigatório e deve ser um array" });
  }
  const quadro = await ShareTicketQuadroService({
    ticketId: parseInt(ticketId, 10),
    groupIds,
    companyId,
    linkType: linkType === "unlinked" ? "unlinked" : "linked",
    sharedStagesByGroup:
      sharedStagesByGroup && typeof sharedStagesByGroup === "object"
        ? sharedStagesByGroup
        : undefined
  });
  if (quadro.ticketId != null) {
    await emitTicketUpdateForKanban(quadro.ticketId, companyId);
  } else {
    emitKanbanCardsRefresh(companyId);
  }
  return res.status(200).json(quadro);
};

export const listLogs = async (req: Request, res: Response): Promise<Response> => {
  const ticketUuidOrId = req.params.ticketUuid ?? req.params.ticketId;
  const { companyId } = req.user;
  const data = await ListQuadroLogsService(ticketUuidOrId, companyId);
  return res.status(200).json(data);
};
