import path from "path";
import uploadConfig from "../config/upload";

/** Pasta no disco para anexos do quadro (ticket ou quadro livre). */
export function quadroAttachmentDiskDir(
  companyId: number,
  opts: { ticketId?: number | null; ticketQuadroId?: number | null }
): string {
  const tid = opts.ticketId != null ? Number(opts.ticketId) : NaN;
  const qid = opts.ticketQuadroId != null ? Number(opts.ticketQuadroId) : NaN;
  if (Number.isFinite(tid) && tid > 0) {
    return path.resolve(uploadConfig.directory, `company${companyId}`, "quadro", String(tid));
  }
  if (Number.isFinite(qid) && qid > 0) {
    return path.resolve(uploadConfig.directory, `company${companyId}`, "quadro-standalone", String(qid));
  }
  throw new Error("ERR_QUADRO_ATTACHMENT_NO_SCOPE");
}

/** URL pública servida em /public/... */
export function quadroAttachmentPublicUrl(
  companyId: number,
  fileName: string,
  opts: { ticketId?: number | null; ticketQuadroId?: number | null }
): string {
  const base = `${process.env.BACKEND_URL}${process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""}`;
  const tid = opts.ticketId != null ? Number(opts.ticketId) : NaN;
  const qid = opts.ticketQuadroId != null ? Number(opts.ticketQuadroId) : NaN;
  if (Number.isFinite(tid) && tid > 0) {
    return `${base}/public/company${companyId}/quadro/${tid}/${fileName}`;
  }
  if (Number.isFinite(qid) && qid > 0) {
    return `${base}/public/company${companyId}/quadro-standalone/${qid}/${fileName}`;
  }
  return `${base}/public/company${companyId}/quadro/0/${fileName}`;
}
