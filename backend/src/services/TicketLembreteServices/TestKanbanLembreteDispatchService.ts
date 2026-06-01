import TicketLembrete from "../../models/TicketLembrete";
import AppError from "../../errors/AppError";
import DispatchKanbanLembreteService from "./DispatchKanbanLembreteService";
import moment from "moment";

/**
 * Dispara um lembrete específico com dados fictícios (para testar template e canais).
 */
const TestKanbanLembreteDispatchService = async (
  ticketId: number,
  companyId: number,
  lembreteId: number
): Promise<void> => {
  const lembrete = await TicketLembrete.findOne({
    where: { id: lembreteId, ticketId, companyId }
  });
  if (!lembrete) {
    throw new AppError("ERR_LEMBRETE_NOT_FOUND", 404);
  }
  if (!lembrete.ativo) {
    throw new AppError("ERR_LEMBRETE_INATIVO", 400);
  }

  const tipo = String(lembrete.tipoGatilho || "").trim();

  if (tipo === "movimentacao") {
    await DispatchKanbanLembreteService(
      ticketId,
      companyId,
      { tipo: "movimentacao", colunaNome: "Coluna (teste)" },
      lembreteId
    );
    return;
  }
  if (tipo === "mudanca_status") {
    await DispatchKanbanLembreteService(
      ticketId,
      companyId,
      { tipo: "mudanca_status", status: "Status (teste)" },
      lembreteId
    );
    return;
  }
  if (tipo === "anexo_adicionado") {
    await DispatchKanbanLembreteService(
      ticketId,
      companyId,
      { tipo: "anexo_adicionado", nomeArquivo: "arquivo-teste.pdf" },
      lembreteId
    );
    return;
  }
  if (tipo === "prazo_proximo" || tipo === "prazo_vencido") {
    const label = moment().format("DD/MM/YYYY");
    await DispatchKanbanLembreteService(
      ticketId,
      companyId,
      {
        tipo: tipo as "prazo_proximo" | "prazo_vencido",
        dataPrazoLabel: label
      },
      lembreteId
    );
    return;
  }

  if (tipo === "agendado") {
    const label = moment().format("DD/MM/YYYY HH:mm");
    await DispatchKanbanLembreteService(
      ticketId,
      companyId,
      { tipo: "agendado", dataHoraLabel: label },
      lembreteId
    );
    return;
  }

  throw new AppError("ERR_LEMBRETE_TEST_GATILHO", 400);
};

export default TestKanbanLembreteDispatchService;
