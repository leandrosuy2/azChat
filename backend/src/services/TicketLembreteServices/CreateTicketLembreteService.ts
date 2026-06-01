import Ticket from "../../models/Ticket";
import TicketLembrete from "../../models/TicketLembrete";
import AppError from "../../errors/AppError";

export interface CreateTicketLembreteData {
  nome: string;
  descricao?: string;
  data?: string | null;
  hora?: string | null;
  eventoId?: number | null;
  addGoogle?: boolean;
  tipoGatilho?: string;
  ativo?: boolean;
  mensagemTemplate?: string | null;
  destinoTipo?: string | null;
  destinoId?: number | null;
  diasAntecedencia?: number | null;
  antecedenciaMinutos?: number | null;
  notifyOnShare?: boolean;
  notifyShareGroupIds?: number[] | null;
  quadroGroupId?: number | null;
}

const CreateTicketLembreteService = async (
  ticketId: number,
  companyId: number,
  data: CreateTicketLembreteData
): Promise<TicketLembrete> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const nome = (data.nome || "").trim();
  if (!nome) {
    throw new AppError("ERR_LEMBRETE_NOME_REQUIRED", 400);
  }

  const tipo = (data.tipoGatilho || "agendado").trim() || "agendado";
  const precisaDataHora = tipo === "agendado";
  const descricao = data.descricao?.trim() || null;

  if (precisaDataHora && (!data.data || !data.hora)) {
    throw new AppError("ERR_LEMBRETE_DATA_HORA_REQUIRED", 400);
  }

  const destinoNormRaw = String(data.destinoTipo || "interno").trim().toLowerCase();
  const destinoNorm =
    destinoNormRaw === "sistema" || destinoNormRaw === "sistema_alerta"
      ? "interno"
      : destinoNormRaw === "grupo"
        ? "fila"
        : destinoNormRaw;

  const lembrete = await TicketLembrete.create({
    ticketId,
    companyId,
    nome,
    descricao,
    data: data.data || null,
    hora: data.hora ? data.hora.trim() : null,
    eventoId: data.eventoId ?? null,
    addGoogle: data.addGoogle === true,
    tipoGatilho: tipo,
    ativo: data.ativo !== false,
    mensagemTemplate:
      data.mensagemTemplate?.trim() || (tipo === "agendado" ? descricao : null),
    destinoTipo: destinoNorm || "interno",
    destinoId: data.destinoId != null ? Number(data.destinoId) : null,
    diasAntecedencia:
      data.diasAntecedencia != null ? Number(data.diasAntecedencia) : null,
    antecedenciaMinutos:
      data.antecedenciaMinutos != null ? Number(data.antecedenciaMinutos) : null,
    ultimoDisparoEm: null,
    ultimoDisparoAt: null,
    notifyOnShare: data.notifyOnShare === true,
    notifyShareGroupIds: Array.isArray(data.notifyShareGroupIds)
      ? data.notifyShareGroupIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : null,
    quadroGroupId:
      data.quadroGroupId != null && Number.isFinite(Number(data.quadroGroupId))
        ? Number(data.quadroGroupId)
        : null
  });

  return lembrete;
};

export default CreateTicketLembreteService;
