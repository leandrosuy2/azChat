import moment from "moment";
import { Op } from "sequelize";
import TicketLembrete from "../../models/TicketLembrete";
import DispatchKanbanLembreteService from "./DispatchKanbanLembreteService";

/** Junta data (YYYY-MM-DD) + hora (HH:mm ou HH:mm:ss) no fuso do servidor (mesmo padrão dos outros crons). */
function parseDataHoraLocal(
  data: string | null | undefined,
  hora: string | null | undefined
): moment.Moment | null {
  if (!data || !hora) return null;
  const d = String(data).trim().slice(0, 10);
  const hRaw = String(hora).trim();
  const h = hRaw.length >= 5 ? hRaw.slice(0, 8) : hRaw;
  const combined = `${d} ${h}`;
  const m = moment(combined, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD H:m"], true);
  return m.isValid() ? m : null;
}

/**
 * Lembretes com tipoGatilho = agendado: dispara uma vez quando data+hora <= agora.
 */
const ProcessKanbanAgendadoLembretesJob = async (): Promise<void> => {
  const now = moment();

  const rows = await TicketLembrete.findAll({
    where: {
      ativo: true,
      tipoGatilho: "agendado",
      data: { [Op.ne]: null },
      hora: { [Op.ne]: null },
      ultimoDisparoAt: { [Op.is]: null }
    },
    attributes: ["id", "ticketId", "companyId", "data", "hora", "ultimoDisparoAt"]
  });

  for (const lembrete of rows) {
    const scheduled = parseDataHoraLocal(lembrete.data, lembrete.hora);
    if (!scheduled) {
      continue;
    }
    if (now.isBefore(scheduled)) {
      continue;
    }

    const label = scheduled.format("DD/MM/YYYY HH:mm");
    await DispatchKanbanLembreteService(
      lembrete.ticketId,
      lembrete.companyId,
      { tipo: "agendado", dataHoraLabel: label },
      lembrete.id
    );
    await lembrete.update({
      ultimoDisparoAt: new Date(),
      ultimoDisparoEm: now.format("YYYY-MM-DD")
    });
  }
};

export default ProcessKanbanAgendadoLembretesJob;
