import { Op } from "sequelize";
import TicketQuadro from "../models/TicketQuadro";
import AppError from "../errors/AppError";
import type { ProcessoDetalheItem } from "./ProcessoDetalhesItens";

/** Carrega só a coluna JSON (unscoped). Se a coluna não existir no banco, retorna vazio. */
export async function batchFetchUnlinkedMirrorByQuadroId(
  quadroIds: number[],
  companyId: number
): Promise<Record<number, Record<string, UnlinkedMirrorPayload>>> {
  if (quadroIds.length === 0) return {};
  try {
    const rows = await TicketQuadro.unscoped().findAll({
      where: { id: { [Op.in]: quadroIds }, companyId },
      attributes: ["id", "unlinkedMirrorDataByGroup"]
    });
    const out: Record<number, Record<string, UnlinkedMirrorPayload>> = {};
    rows.forEach((r) => {
      out[r.id] =
        (r.unlinkedMirrorDataByGroup as Record<string, UnlinkedMirrorPayload>) || {};
    });
    return out;
  } catch {
    return {};
  }
}

/** Campos editáveis por área quando o cartão está «desvinculado» (espelho). */
export type UnlinkedMirrorPayload = Partial<{
  nomeProjeto: string | null;
  status: string;
  description: string | null;
  valorServico: number | null;
  valorEntrada: number | null;
  dataPrazo: string | null;
  detalhesProcesso: string | null;
  detalhesProcessoItens: ProcessoDetalheItem[] | null;
  customFields: any;
}>;

export function parseViewQuadroGroupId(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sharedGroupIdsAsNumbers(raw: unknown): number[] {
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
  return arr.map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

/** Leitura/escrita no espelho desvinculado: outra área que compartilha o card. */
export function isUnlinkedMirrorView(
  quadro: TicketQuadro,
  viewGid: number | null | undefined
): viewGid is number {
  if (viewGid == null || viewGid <= 0) return false;
  const link = String(quadro.linkType || "linked").toLowerCase();
  if (link !== "unlinked") return false;
  const shared = sharedGroupIdsAsNumbers(quadro.sharedGroupIds);
  if (!shared.includes(viewGid)) return false;
  const home =
    quadro.quadroGroupId != null ? Number(quadro.quadroGroupId) : null;
  if (home == null) return true;
  return viewGid !== home;
}

export function readUnlinkedMirrorMap(
  quadro: TicketQuadro
): Record<string, UnlinkedMirrorPayload> {
  return quadro.unlinkedMirrorDataByGroup || {};
}

export async function mergeUnlinkedMirrorPayload(
  quadro: TicketQuadro,
  viewGid: number,
  patch: UnlinkedMirrorPayload
): Promise<void> {
  const key = String(viewGid);
  const loaded = await batchFetchUnlinkedMirrorByQuadroId(
    [quadro.id],
    quadro.companyId
  );
  const current: Record<string, UnlinkedMirrorPayload> = {
    ...(loaded[quadro.id] || {})
  };
  const prev = current[key] || {};
  current[key] = { ...prev, ...patch };
  try {
    await TicketQuadro.unscoped().update(
      { unlinkedMirrorDataByGroup: current } as any,
      { where: { id: quadro.id, companyId: quadro.companyId } }
    );
  } catch {
    throw new AppError(
      "Não foi possível gravar dados do espelho desvinculado. Rode as migrations (coluna unlinkedMirrorDataByGroup em TicketQuadros).",
      500
    );
  }
  await quadro.reload();
}

function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  (Object.keys(obj) as (keyof T)[]).forEach((k) => {
    const v = obj[k];
    if (v !== undefined) (out as any)[k] = v;
  });
  return out;
}

/** Após PUT de valores, monta o patch só com chaves enviadas. */
export function buildUnlinkedPatchFromValuesBody(body: {
  valorServico?: number | null;
  valorEntrada?: number | null;
  nomeProjeto?: string | null;
  detalhesProcesso?: string | null;
  customFields?: any;
  detalhesProcessoItens?: ProcessoDetalheItem[] | null;
  dataPrazo?: string | null;
}): UnlinkedMirrorPayload {
  return pickDefined({
    valorServico: body.valorServico,
    valorEntrada: body.valorEntrada,
    nomeProjeto: body.nomeProjeto,
    detalhesProcesso: body.detalhesProcesso,
    customFields: body.customFields,
    detalhesProcessoItens: body.detalhesProcessoItens,
    dataPrazo: body.dataPrazo
  }) as UnlinkedMirrorPayload;
}

type QuadroRowLike = {
  nomeProjeto?: string | null;
  valorServico?: number | null;
  valorEntrada?: number | null;
  customFields?: any;
  status?: string | null;
  description?: string | null;
  dataPrazo?: string | null;
  detalhesProcesso?: string | null;
  detalhesProcessoItens?: ProcessoDetalheItem[] | any;
  linkType?: string | null;
  sharedGroupIds?: unknown;
  quadroGroupId?: number | null;
  unlinkedMirrorDataByGroup?: Record<string, UnlinkedMirrorPayload> | null;
};

/** Lista Kanban / cartão: aplica overrides da área visualizada. */
export function applyUnlinkedMirrorToDisplayFields<T extends QuadroRowLike>(
  row: T,
  listViewGroupId: number | null
): T {
  if (
    listViewGroupId == null ||
    listViewGroupId <= 0 ||
    String(row.linkType || "linked").toLowerCase() !== "unlinked"
  ) {
    return row;
  }
  const shared = sharedGroupIdsAsNumbers(row.sharedGroupIds);
  if (!shared.includes(listViewGroupId)) return row;
  const home =
    row.quadroGroupId != null ? Number(row.quadroGroupId) : null;
  if (home != null && listViewGroupId === home) return row;

  const ov =
    row.unlinkedMirrorDataByGroup?.[String(listViewGroupId)] || {};
  if (!ov || typeof ov !== "object") return row;

  const next = { ...row };
  if (ov.nomeProjeto !== undefined) next.nomeProjeto = ov.nomeProjeto;
  if (ov.valorServico !== undefined) next.valorServico = ov.valorServico;
  if (ov.valorEntrada !== undefined) next.valorEntrada = ov.valorEntrada;
  if (ov.customFields !== undefined) next.customFields = ov.customFields;
  if (ov.status !== undefined) next.status = ov.status;
  if (ov.description !== undefined) next.description = ov.description;
  if (ov.dataPrazo !== undefined) next.dataPrazo = ov.dataPrazo;
  if (ov.detalhesProcesso !== undefined) next.detalhesProcesso = ov.detalhesProcesso;
  if (ov.detalhesProcessoItens !== undefined) {
    next.detalhesProcessoItens = ov.detalhesProcessoItens;
  }
  return next;
}
