import { v4 as uuidv4 } from "uuid";
import TicketQuadro from "../../models/TicketQuadro";
import TicketQuadroAnexo from "../../models/TicketQuadroAnexo";
import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";

interface Request {
  ticketId: number;
  groupIds: number[];
  companyId: number;
  linkType?: "linked" | "unlinked";
  sharedStagesByGroup?: Record<string, number[]>;
}

function normalizeGroupIds(ids: number[]): number[] {
  return Array.from(
    new Set(
      (ids || [])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  );
}

function normalizeSharedStages(
  raw: Record<string, number[]> | undefined
): Record<string, number[]> | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, number[]> = {};
  for (const k of Object.keys(raw)) {
    const arr = (raw as Record<string, unknown>)[k];
    out[String(k)] = Array.isArray(arr)
      ? arr.map((x) => Number(x)).filter((n) => Number.isFinite(n))
      : [];
  }
  return out;
}

function toUniquePositiveNumbers(raw: unknown): number[] {
  if (raw == null) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      arr = Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  } else {
    return [];
  }
  return Array.from(
    new Set(
      arr.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
    )
  );
}

function readObjectMap(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return p && typeof p === "object" && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, any>)
    : {};
}

async function cloneAttachmentsFromTicketToStandalone(
  ticketId: number,
  newTicketQuadroId: number,
  companyId: number
): Promise<void> {
  const attachments = await TicketQuadroAnexo.findAll({
    where: { ticketId, companyId }
  });
  if (!attachments.length) return;
  await TicketQuadroAnexo.bulkCreate(
    attachments.map((a) => ({
      ticketId: null,
      ticketQuadroId: newTicketQuadroId,
      name: a.name,
      path: a.path,
      isCapa: Boolean(a.isCapa),
      processoBlocoId: a.processoBlocoId ?? null,
      legenda: a.legenda ?? null,
      companyId
    }))
  );
}

async function cloneAttachmentsFromStandaloneToStandalone(
  sourceTicketQuadroId: number,
  newTicketQuadroId: number,
  companyId: number
): Promise<void> {
  const attachments = await TicketQuadroAnexo.findAll({
    where: { ticketQuadroId: sourceTicketQuadroId, companyId }
  });
  if (!attachments.length) return;
  await TicketQuadroAnexo.bulkCreate(
    attachments.map((a) => ({
      ticketId: null,
      ticketQuadroId: newTicketQuadroId,
      name: a.name,
      path: a.path,
      isCapa: Boolean(a.isCapa),
      processoBlocoId: a.processoBlocoId ?? null,
      legenda: a.legenda ?? null,
      companyId
    }))
  );
}

async function detachGroupsAsIndependentQuadros(
  source: TicketQuadro,
  removedGroupIds: number[],
  companyId: number,
  preferredStagesByGroup?: Record<string, number[]>
): Promise<void> {
  if (!removedGroupIds.length) return;

  const sourceUnlinkedMap = readObjectMap(source.unlinkedMirrorDataByGroup);
  const ticket =
    source.ticketId != null
      ? await Ticket.findOne({
          where: { id: source.ticketId, companyId },
          attributes: ["id", "contactId"]
        })
      : null;

  for (const groupId of removedGroupIds) {
    const viewPatch = readObjectMap(sourceUnlinkedMap[String(groupId)]);
    const preferredStageRaw = preferredStagesByGroup?.[String(groupId)];
    const preferredStageId =
      Array.isArray(preferredStageRaw) && preferredStageRaw.length > 0
        ? Number(preferredStageRaw[0])
        : null;
    const kanbanTagId =
      preferredStageId != null && Number.isFinite(preferredStageId) && preferredStageId > 0
        ? preferredStageId
        : null;
    const standalone = await TicketQuadro.create({
      uuid: uuidv4(),
      ticketId: null,
      companyId,
      linkedContactId:
        source.linkedContactId ?? (ticket ? (ticket as any).contactId ?? null : null),
      quadroGroupId: groupId,
      kanbanTagId,
      sharedGroupIds: [],
      linkType: "linked",
      sharedStagesByGroup: {},
      status: viewPatch.status ?? source.status ?? "aguardando",
      description:
        viewPatch.description !== undefined ? viewPatch.description : source.description ?? null,
      valorServico:
        viewPatch.valorServico !== undefined ? viewPatch.valorServico : source.valorServico ?? null,
      valorEntrada:
        viewPatch.valorEntrada !== undefined ? viewPatch.valorEntrada : source.valorEntrada ?? null,
      nomeProjeto:
        viewPatch.nomeProjeto !== undefined ? viewPatch.nomeProjeto : source.nomeProjeto ?? null,
      dataPrazo:
        viewPatch.dataPrazo !== undefined ? viewPatch.dataPrazo : source.dataPrazo ?? null,
      detalhesProcesso:
        viewPatch.detalhesProcesso !== undefined
          ? viewPatch.detalhesProcesso
          : source.detalhesProcesso ?? null,
      detalhesProcessoItens:
        viewPatch.detalhesProcessoItens !== undefined
          ? viewPatch.detalhesProcessoItens
          : source.detalhesProcessoItens ?? [],
      customFields:
        viewPatch.customFields !== undefined ? viewPatch.customFields : source.customFields ?? []
    });

    if (source.ticketId != null) {
      await cloneAttachmentsFromTicketToStandalone(source.ticketId, standalone.id, companyId);
    } else {
      await cloneAttachmentsFromStandaloneToStandalone(source.id, standalone.id, companyId);
    }
  }
}

function isMissingColumnError(err: unknown, column: string): boolean {
  const anyErr = err as {
    original?: { code?: string; message?: string };
    parent?: { code?: string; message?: string };
    message?: string;
  };
  const msg = String(
    anyErr?.original?.message || anyErr?.parent?.message || anyErr?.message || ""
  ).toLowerCase();
  const code = String(anyErr?.original?.code || anyErr?.parent?.code || "");
  return code === "42703" && msg.includes(column.toLowerCase());
}

async function safeUpdateQuadroWithLegacyFallback(
  quadro: TicketQuadro,
  payload: Record<string, any>
): Promise<void> {
  try {
    await quadro.update(payload as any);
    return;
  } catch (err) {
    // Banco sem migration da coluna opcional: atualiza sem ela para manter compatibilidade.
    if (
      isMissingColumnError(err, "unlinkedMirrorDataByGroup") &&
      Object.prototype.hasOwnProperty.call(payload, "unlinkedMirrorDataByGroup")
    ) {
      const fallback = { ...payload };
      delete fallback.unlinkedMirrorDataByGroup;
      await quadro.update(fallback as any);
      return;
    }
    throw err;
  }
}

const ShareTicketQuadroService = async ({
  ticketId,
  groupIds,
  companyId,
  linkType = "linked",
  sharedStagesByGroup
}: Request): Promise<TicketQuadro> => {
  const normalizedIds = normalizeGroupIds(groupIds);
  const normalizedStages = normalizeSharedStages(sharedStagesByGroup);

  const updateData: {
    sharedGroupIds: number[];
    linkType?: string;
    sharedStagesByGroup?: Record<string, number[]>;
  } = { sharedGroupIds: normalizedIds };
  if (linkType === "unlinked" || linkType === "linked") {
    updateData.linkType = linkType;
  }
  if (normalizedStages != null) {
    updateData.sharedStagesByGroup = normalizedStages;
  }

  /** Kanban: id sintético `-TicketQuadros.id` para cartão sem Ticket (quadro livre). */
  if (ticketId < 0) {
    const rowId = Math.abs(ticketId);
    const quadro = await TicketQuadro.findOne({
      where: { id: rowId, companyId, ticketId: null }
    });
    if (!quadro) {
      throw new AppError("Cartão (quadro) não encontrado.", 404);
    }
    if (linkType === "unlinked") {
      // "Desvinculado" deve ser independente de verdade: cria cópias físicas e remove vínculos.
      await detachGroupsAsIndependentQuadros(
        quadro,
        normalizedIds,
        companyId,
        normalizedStages
      );
      await safeUpdateQuadroWithLegacyFallback(quadro, {
        sharedGroupIds: [],
        linkType: "linked",
        sharedStagesByGroup: {},
        unlinkedMirrorDataByGroup: {}
      });
      await quadro.reload();
      return quadro;
    }
    const currentShared = toUniquePositiveNumbers(quadro.sharedGroupIds);
    const removedGroupIds = currentShared.filter((gid) => !normalizedIds.includes(gid));
    await detachGroupsAsIndependentQuadros(quadro, removedGroupIds, companyId);

    const cleanedUnlinked = readObjectMap(quadro.unlinkedMirrorDataByGroup);
    const cleanedStages = readObjectMap(quadro.sharedStagesByGroup);
    removedGroupIds.forEach((gid) => {
      delete cleanedUnlinked[String(gid)];
      delete cleanedStages[String(gid)];
    });

    await safeUpdateQuadroWithLegacyFallback(quadro, {
      ...updateData,
      unlinkedMirrorDataByGroup: cleanedUnlinked,
      sharedStagesByGroup:
        normalizedStages != null ? normalizedStages : cleanedStages
    });
    await quadro.reload();
    return quadro;
  }

  let quadro = await TicketQuadro.findOne({ where: { ticketId } });

  if (!quadro) {
    quadro = await TicketQuadro.create({
      uuid: uuidv4(),
      ticketId,
      companyId,
      sharedGroupIds: normalizedIds,
      status: "aguardando",
      linkType: updateData.linkType ?? "linked",
      sharedStagesByGroup: updateData.sharedStagesByGroup
    });
  } else {
    if (linkType === "unlinked") {
      // "Desvinculado" deve ser independente de verdade: cria cópias físicas e remove vínculos.
      await detachGroupsAsIndependentQuadros(
        quadro,
        normalizedIds,
        companyId,
        normalizedStages
      );
      await safeUpdateQuadroWithLegacyFallback(quadro, {
        sharedGroupIds: [],
        linkType: "linked",
        sharedStagesByGroup: {},
        unlinkedMirrorDataByGroup: {}
      });
      await quadro.reload();
      return quadro;
    }
    const currentShared = toUniquePositiveNumbers(quadro.sharedGroupIds);
    const removedGroupIds = currentShared.filter((gid) => !normalizedIds.includes(gid));
    await detachGroupsAsIndependentQuadros(quadro, removedGroupIds, companyId);

    const cleanedUnlinked = readObjectMap(quadro.unlinkedMirrorDataByGroup);
    const cleanedStages = readObjectMap(quadro.sharedStagesByGroup);
    removedGroupIds.forEach((gid) => {
      delete cleanedUnlinked[String(gid)];
      delete cleanedStages[String(gid)];
    });

    await safeUpdateQuadroWithLegacyFallback(quadro, {
      ...updateData,
      unlinkedMirrorDataByGroup: cleanedUnlinked,
      sharedStagesByGroup:
        normalizedStages != null ? normalizedStages : cleanedStages
    });
    await quadro.reload();
  }

  return quadro;
};

export default ShareTicketQuadroService;
