import { resolveQuadroContext } from "./ResolveQuadroFromPublicParam";

/** ticketId ou ticketQuadroId conforme o contexto do quadro (atendimento vs livre). */
export const resolveQuadroAttachmentScope = async (
  publicParam: string,
  companyId: number
): Promise<{ ticketId: number | null; ticketQuadroId: number | null }> => {
  const ctx = await resolveQuadroContext(String(publicParam || "").trim(), companyId);
  if (ctx.mode === "ticket") {
    return { ticketId: ctx.ticket.id, ticketQuadroId: null };
  }
  return { ticketId: null, ticketQuadroId: ctx.quadro.id };
};
