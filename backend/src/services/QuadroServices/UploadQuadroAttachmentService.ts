import { Op } from "sequelize";
import TicketQuadroAnexo from "../../models/TicketQuadroAnexo";
import AppError from "../../errors/AppError";
import { quadroAttachmentPublicUrl } from "../../helpers/QuadroAttachmentPaths";

interface UploadOpts {
  companyId: number;
  filename: string;
  ticketId: number | null;
  ticketQuadroId: number | null;
  processoBlocoId?: string | null;
}

const UploadQuadroAttachmentService = async (
  opts: UploadOpts
): Promise<{
  id: number;
  name: string;
  url: string;
  isCapa: boolean;
  createdAt: Date;
  processoBlocoId: string | null;
  legenda: string | null;
}> => {
  const { companyId, filename, ticketId, ticketQuadroId, processoBlocoId: rawBloco } = opts;
  const hasTicket = ticketId != null && Number(ticketId) > 0;
  const hasQuadro = ticketQuadroId != null && Number(ticketQuadroId) > 0;
  if (!hasTicket && !hasQuadro) {
    throw new AppError("ERR_QUADRO_ATTACHMENT_NO_SCOPE", 400);
  }

  const processoBlocoId =
    rawBloco != null && String(rawBloco).trim() !== ""
      ? String(rawBloco).trim().slice(0, 36)
      : null;

  const whereCount = hasTicket ? { ticketId: Number(ticketId) } : { ticketQuadroId: Number(ticketQuadroId) };
  const globalWhere = {
    ...whereCount,
    [Op.or]: [{ processoBlocoId: null }, { processoBlocoId: "" }]
  };
  let isCapa = false;
  if (processoBlocoId == null) {
    const count = await TicketQuadroAnexo.count({ where: globalWhere as Record<string, unknown> });
    isCapa = count === 0;
  }

  const anexo = await TicketQuadroAnexo.create({
    ticketId: hasTicket ? Number(ticketId) : null,
    ticketQuadroId: hasQuadro ? Number(ticketQuadroId) : null,
    companyId,
    name: filename,
    path: filename,
    isCapa,
    processoBlocoId,
    legenda: null
  });

  const url = quadroAttachmentPublicUrl(companyId, filename, {
    ticketId: hasTicket ? Number(ticketId) : null,
    ticketQuadroId: hasQuadro ? Number(ticketQuadroId) : null
  });

  return {
    id: anexo.id,
    name: anexo.name,
    url,
    isCapa: anexo.isCapa,
    createdAt: anexo.createdAt,
    processoBlocoId: anexo.processoBlocoId ?? null,
    legenda: anexo.legenda ?? null
  };
};

export default UploadQuadroAttachmentService;
