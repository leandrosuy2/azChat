export interface ProcessoCampoExtra {
  id: string;
  nome: string;
  valor: string;
}

export interface ProcessoDetalheItem {
  id: string;
  titulo: string;
  /** Anotações longas do processo (texto livre). */
  descricao: string;
  campos?: ProcessoCampoExtra[];
}

const MAX_ITEMS = 120;
const MAX_TITULO = 240;
const MAX_DESCRICAO = 64000;
const MAX_CAMPOS_POR_ITEM = 80;
const MAX_CAMPO_NOME = 200;
const MAX_CAMPO_VALOR = 8000;

function sanitizeCampos(raw: unknown): ProcessoCampoExtra[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ProcessoCampoExtra[] = [];
  for (const c of raw) {
    if (c == null || typeof c !== "object") {
      continue;
    }
    const o = c as Record<string, unknown>;
    const idRaw = String(o.id ?? "").trim();
    const id =
      idRaw ||
      `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const nome = String(o.nome ?? "").trim().slice(0, MAX_CAMPO_NOME);
    const valor = String(o.valor ?? "").slice(0, MAX_CAMPO_VALOR);
    out.push({ id, nome, valor });
    if (out.length >= MAX_CAMPOS_POR_ITEM) {
      break;
    }
  }
  return out;
}

/**
 * Normaliza o body da API para persistir em TicketQuadros.detalhesProcessoItens (JSON).
 * `undefined` = não alterar coluna; `null` ou `[]` = limpar.
 */
export const sanitizeProcessoDetalhesItensInput = (
  raw: unknown
): ProcessoDetalheItem[] | undefined | null => {
  if (raw === undefined) {
    return undefined;
  }
  if (raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return undefined;
  }
  const out: ProcessoDetalheItem[] = [];
  for (const x of raw) {
    if (x == null || typeof x !== "object") {
      continue;
    }
    const o = x as Record<string, unknown>;
    const idRaw = String(o.id ?? "").trim();
    const id =
      idRaw ||
      `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const titulo = String(o.titulo ?? "").trim().slice(0, MAX_TITULO);
    const descricao = String(o.descricao ?? "").slice(0, MAX_DESCRICAO);
    const campos = sanitizeCampos(o.campos);
    out.push({
      id,
      titulo,
      descricao,
      campos: campos.length ? campos : undefined
    });
    if (out.length >= MAX_ITEMS) {
      break;
    }
  }
  return out;
};
