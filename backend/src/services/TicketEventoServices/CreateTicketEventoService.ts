import Ticket from "../../models/Ticket";
import TicketEvento from "../../models/TicketEvento";
import AppError from "../../errors/AppError";

const SETORES_VALIDOS = ["consulta", "instalacao", "visita_tecnica"];

interface CreateTicketEventoData {
  setor: string;
  responsavel?: string;
  tipo: string;
  data: string;
  hora: string;
  localizacao?: string;
  descricao?: string;
}

const CreateTicketEventoService = async (
  ticketId: number,
  companyId: number,
  data: CreateTicketEventoData
): Promise<TicketEvento> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId },
    attributes: ["id"]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const setor = (data.setor || "").toLowerCase();
  if (!SETORES_VALIDOS.includes(setor)) {
    throw new AppError("ERR_INVALID_SETOR", 400);
  }
  if (!data.tipo || !data.data || !data.hora) {
    throw new AppError("ERR_EVENTO_TIPO_DATA_HORA_REQUIRED", 400);
  }

  const evento = await TicketEvento.create({
    ticketId,
    companyId,
    setor,
    responsavel: data.responsavel || null,
    tipo: data.tipo.trim(),
    data: data.data,
    hora: data.hora.trim(),
    localizacao: data.localizacao?.trim() || null,
    descricao: data.descricao?.trim() || null
  });

  return evento;
};

export default CreateTicketEventoService;
