import TicketQuadro from "../../models/TicketQuadro";
import { resolveQuadroContext, ensureQuadroRowForTicket } from "../../helpers/ResolveQuadroFromPublicParam";
import type { ProcessoDetalheItem } from "../../helpers/ProcessoDetalhesItens";
import {
  buildUnlinkedPatchFromValuesBody,
  isUnlinkedMirrorView,
  mergeUnlinkedMirrorPayload,
  parseViewQuadroGroupId
} from "../../helpers/UnlinkedMirrorQuadro";

interface UpdateData {
  valorServico?: number | null;
  valorEntrada?: number | null;
  nomeProjeto?: string | null;
  detalhesProcesso?: string | null;
  detalhesProcessoItens?: ProcessoDetalheItem[] | null;
  customFields?: any;
  dataPrazo?: string | null;
}

/**
 * Atualiza valores do quadro. `publicParam` = UUID do ticket, id numérico do ticket, ou UUID do quadro livre.
 */
const UpdateQuadroValuesService = async (
  publicParam: string,
  companyId: number,
  valorServico: number | null,
  valorEntrada: number | null,
  nomeProjeto?: string | null,
  detalhesProcesso?: string | null,
  customFields?: any,
  detalhesProcessoItens?: ProcessoDetalheItem[] | null,
  dataPrazo?: string | null,
  viewQuadroGroupId?: number | null
): Promise<TicketQuadro> => {
  const viewGid = parseViewQuadroGroupId(viewQuadroGroupId);
  const updateData: UpdateData = {};
  if (valorServico !== undefined) updateData.valorServico = valorServico;
  if (valorEntrada !== undefined) updateData.valorEntrada = valorEntrada;
  if (nomeProjeto !== undefined) updateData.nomeProjeto = nomeProjeto;
  if (detalhesProcesso !== undefined) updateData.detalhesProcesso = detalhesProcesso;
  if (detalhesProcessoItens !== undefined) updateData.detalhesProcessoItens = detalhesProcessoItens;
  if (customFields !== undefined) updateData.customFields = customFields;
  if (dataPrazo !== undefined) {
    updateData.dataPrazo = dataPrazo === null || dataPrazo === "" ? null : String(dataPrazo).trim();
  }

  const ctx = await resolveQuadroContext(publicParam, companyId);

  if (Object.keys(updateData).length === 0) {
    if (ctx.mode === "standalone") return ctx.quadro.reload();
    const q = ctx.quadro ?? (await ensureQuadroRowForTicket(ctx.ticket.id, companyId));
    return q.reload();
  }

  if (ctx.mode === "ticket") {
    let quadro = ctx.quadro;
    if (!quadro) {
      quadro = await ensureQuadroRowForTicket(ctx.ticket.id, companyId, {
        status: "aguardando",
        description: null
      });
    }
    if (
      viewGid &&
      isUnlinkedMirrorView(quadro, viewGid) &&
      Object.keys(updateData).length > 0
    ) {
      await mergeUnlinkedMirrorPayload(
        quadro,
        viewGid,
        buildUnlinkedPatchFromValuesBody(updateData)
      );
      return quadro.reload();
    }
    await quadro.update(updateData);
    return quadro.reload();
  }

  if (
    viewGid &&
    isUnlinkedMirrorView(ctx.quadro, viewGid) &&
    Object.keys(updateData).length > 0
  ) {
    await mergeUnlinkedMirrorPayload(
      ctx.quadro,
      viewGid,
      buildUnlinkedPatchFromValuesBody(updateData)
    );
    return ctx.quadro.reload();
  }

  await ctx.quadro.update(updateData);
  return ctx.quadro.reload();
};

export default UpdateQuadroValuesService;
