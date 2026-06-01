import TicketLembrete from "../../models/TicketLembrete";
import AppError from "../../errors/AppError";

export interface UpdateTicketLembreteData {
  nome?: string;
  descricao?: string | null;
  data?: string | null;
  hora?: string | null;
  ativo?: boolean;
  mensagemTemplate?: string | null;
  destinoTipo?: string | null;
  destinoId?: number | null;
  diasAntecedencia?: number | null;
  antecedenciaMinutos?: number | null;
  tipoGatilho?: string;
  addGoogle?: boolean;
  notifyOnShare?: boolean;
  notifyShareGroupIds?: number[] | null;
  quadroGroupId?: number | null;
}

const UpdateTicketLembreteService = async (
  ticketId: number,
  companyId: number,
  lembreteId: number,
  data: UpdateTicketLembreteData
): Promise<TicketLembrete> => {
  const lembrete = await TicketLembrete.findOne({
    where: { id: lembreteId, ticketId, companyId }
  });

  if (!lembrete) {
    throw new AppError("ERR_LEMBRETE_NOT_FOUND", 404);
  }

  const patch: Record<string, unknown> = {};

  if (data.nome !== undefined) {
    const n = String(data.nome).trim();
    if (!n) {
      throw new AppError("ERR_LEMBRETE_NOME_REQUIRED", 400);
    }
    patch.nome = n;
  }
  if (data.descricao !== undefined) {
    patch.descricao = data.descricao === null ? null : String(data.descricao).trim() || null;
  }
  if (data.data !== undefined) {
    patch.data = data.data;
  }
  if (data.hora !== undefined) {
    patch.hora = data.hora === null ? null : String(data.hora).trim();
  }
  if (data.ativo !== undefined) {
    patch.ativo = !!data.ativo;
  }
  if (data.mensagemTemplate !== undefined) {
    patch.mensagemTemplate =
      data.mensagemTemplate === null ? null : String(data.mensagemTemplate).trim() || null;
  }
  if (data.destinoTipo !== undefined) {
    if (data.destinoTipo === null) {
      patch.destinoTipo = null;
    } else {
      const destinoNormRaw = String(data.destinoTipo).trim().toLowerCase();
      patch.destinoTipo =
        destinoNormRaw === "sistema" || destinoNormRaw === "sistema_alerta"
          ? "interno"
          : destinoNormRaw === "grupo"
            ? "fila"
            : destinoNormRaw;
    }
  }
  if (data.destinoId !== undefined) {
    patch.destinoId = data.destinoId == null ? null : Number(data.destinoId);
  }
  if (data.diasAntecedencia !== undefined) {
    patch.diasAntecedencia =
      data.diasAntecedencia == null ? null : Number(data.diasAntecedencia);
  }
  if (data.antecedenciaMinutos !== undefined) {
    patch.antecedenciaMinutos =
      data.antecedenciaMinutos == null ? null : Number(data.antecedenciaMinutos);
  }
  if (data.tipoGatilho !== undefined) {
    const t = String(data.tipoGatilho).trim() || "agendado";
    patch.tipoGatilho = t;
    if (t !== "agendado") {
      patch.data = null;
      patch.hora = null;
    }
  }
  if (data.addGoogle !== undefined) {
    patch.addGoogle = !!data.addGoogle;
  }
  if (data.notifyOnShare !== undefined) {
    patch.notifyOnShare = !!data.notifyOnShare;
  }
  if (data.notifyShareGroupIds !== undefined) {
    patch.notifyShareGroupIds = Array.isArray(data.notifyShareGroupIds)
      ? data.notifyShareGroupIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : null;
  }
  if (data.quadroGroupId !== undefined) {
    patch.quadroGroupId =
      data.quadroGroupId == null ? null : Number(data.quadroGroupId);
  }

  if (Object.keys(patch).length === 0) {
    return lembrete;
  }

  await lembrete.update(patch);
  return lembrete.reload();
};

export default UpdateTicketLembreteService;
