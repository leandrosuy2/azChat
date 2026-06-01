/** Prefixo na primeira linha de `message` para identificar sequência (texto, pausa, mídia). */
export const QUICK_MSG_SEQ_PREFIX = "__PRIMATA_QM_SEQ_V1__\n";

/** Nome do ficheiro guardado em disco a partir de URL completa ou basename. */
export const basenameQuickMessageFile = (mediaPath) => {
  if (!mediaPath) return null;
  const clean = String(mediaPath).split("?")[0];
  const parts = clean.split("/").filter(Boolean);
  const last = parts.pop();
  return last ? last.replace(/ /g, "_") : null;
};

const clampDelay = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.min(300, x);
};

/** Conta quantos passos `media` existem antes do índice `stepIndex` (não inclusivo). */
export const mediaOrdinalBeforeStepIndex = (steps, stepIndex) => {
  if (!Array.isArray(steps)) return 0;
  let n = 0;
  for (let i = 0; i < stepIndex && i < steps.length; i += 1) {
    if (steps[i]?.type === "media") n += 1;
  }
  return n;
};

/** Ordinal do passo media em `stepIndex` (0 = primeiro anexo). */
export const mediaOrdinalAtStepIndex = (steps, stepIndex) => {
  if (!steps?.[stepIndex] || steps[stepIndex].type !== "media") return null;
  return mediaOrdinalBeforeStepIndex(steps, stepIndex);
};

export const normalizeSequenceSteps = (steps) => {
  if (!Array.isArray(steps)) return [];
  const raw = steps
    .map((s) => {
      if (!s || !s.type) return null;
      if (s.type === "text") return { type: "text", body: String(s.body ?? "") };
      if (s.type === "delay") return { type: "delay", seconds: clampDelay(s.seconds) };
      if (s.type === "media") return { type: "media", caption: String(s.caption ?? "") };
      return null;
    })
    .filter(Boolean);
  let mi = 0;
  return raw.map((s) => {
    if (s.type !== "media") return s;
    const o = { ...s, mediaIndex: mi };
    mi += 1;
    return o;
  });
};

/**
 * @param {string|null|undefined} message
 * @returns {{ v: number, steps: Array<{type:string}> }|null}
 */
export const parseQuickMessageSequence = (message) => {
  const s = String(message || "");
  if (!s.startsWith(QUICK_MSG_SEQ_PREFIX)) return null;
  try {
    const data = JSON.parse(s.slice(QUICK_MSG_SEQ_PREFIX.length));
    if (!data || !Array.isArray(data.steps)) return null;
    const steps = normalizeSequenceSteps(data.steps);
    if (steps.length === 0) return null;
    return { v: data.v || 1, steps };
  } catch {
    return null;
  }
};

export const stringifyQuickMessageSequence = (steps) =>
  QUICK_MSG_SEQ_PREFIX + JSON.stringify({ v: 2, steps: normalizeSequenceSteps(steps) });

export const sequenceHasMediaStep = (steps) =>
  Array.isArray(steps) && steps.some((s) => s.type === "media");

export const countMediaSteps = (steps) =>
  Array.isArray(steps) ? steps.filter((s) => s.type === "media").length : 0;

/** Parse do campo `attachments` da API (string JSON ou já array). */
export const parseAttachmentsList = (raw) => {
  if (Array.isArray(raw)) return raw.filter((x) => x && x.path);
  if (!raw || typeof raw !== "string") return [];
  try {
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j.filter((x) => x && x.path) : [];
  } catch {
    return [];
  }
};

/**
 * URL pública do ficheiro em quickMessage (usa o mesmo padrão que `mediaPath` completo da API).
 * @param {object} quickMsg registo com companyId, mediaPath (URL completa opcional)
 * @param {string} storageBasename nome guardado em disco (ex.: 123.jpg)
 */
export const buildQuickMessageAttachmentPublicUrl = (quickMsg, storageBasename) => {
  if (!storageBasename || !quickMsg) return null;
  const sample = quickMsg.mediaPath;
  if (typeof sample === "string" && sample.includes("/public/")) {
    const origin = sample.split("/public/")[0];
    return `${origin}/public/company${quickMsg.companyId}/quickMessage/${storageBasename}`;
  }
  const base = process.env.REACT_APP_BACKEND_URL;
  if (base) {
    const clean = String(base).replace(/\/$/, "");
    return `${clean}/public/company${quickMsg.companyId}/quickMessage/${storageBasename}`;
  }
  return null;
};

/** Texto curto para lista / chips (não é JSON completo). */
export const quickMessageSnippet = (message) => {
  const seq = parseQuickMessageSequence(message);
  if (!seq) return String(message || "").replace(/\s+/g, " ").slice(0, 80);
  const parts = [];
  seq.steps.forEach((st) => {
    if (st.type === "text" && String(st.body || "").trim()) {
      parts.push(String(st.body).trim().replace(/\s+/g, " ").slice(0, 36));
    }
    if (st.type === "delay") parts.push(`⏱${st.seconds}s`);
    if (st.type === "media") parts.push("📎");
  });
  const t = parts.join(" · ");
  return t.length > 80 ? `${t.slice(0, 77)}…` : t;
};
