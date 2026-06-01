import moment from "moment";
import { Op } from "sequelize";
import TicketQuadro from "../../models/TicketQuadro";
import TicketLembrete from "../../models/TicketLembrete";
import DispatchKanbanLembreteService from "./DispatchKanbanLembreteService";

/**
 * Job periódico: lembretes prazo_proximo / prazo_vencido conforme TicketQuadros.dataPrazo.
 * — diasAntecedencia: dispara no dia (prazo − N dias).
 * — antecedenciaMinutos: no dia do prazo, dispara N minutos antes do fim do dia (23:59:59).
 */
const ProcessKanbanPrazoLembretesJob = async (): Promise<void> => {
  const today = moment().format("YYYY-MM-DD");

  const quadros = await TicketQuadro.findAll({
    where: {
      ticketId: { [Op.ne]: null as unknown as number },
      dataPrazo: { [Op.ne]: null }
    }
  });

  for (const q of quadros) {
    const tid = q.ticketId;
    if (!tid || !q.dataPrazo || !q.companyId) {
      continue;
    }

    const prazoStr = moment(q.dataPrazo).format("YYYY-MM-DD");
    const label = moment(q.dataPrazo).format("DD/MM/YYYY");

    const proximos = await TicketLembrete.findAll({
      where: {
        ticketId: tid,
        companyId: q.companyId,
        ativo: true,
        tipoGatilho: "prazo_proximo"
      }
    });

    for (const l of proximos) {
      const mins =
        l.antecedenciaMinutos != null ? Number(l.antecedenciaMinutos) : 0;
      if (Number.isFinite(mins) && mins > 0) {
        const deadlineEnd = moment(q.dataPrazo).endOf("day");
        const threshold = deadlineEnd.clone().subtract(mins, "minutes");
        const now = moment();
        if (now.isBefore(threshold) || now.isAfter(deadlineEnd)) {
          continue;
        }
        if (
          l.ultimoDisparoAt &&
          moment(l.ultimoDisparoAt).valueOf() >= threshold.valueOf()
        ) {
          continue;
        }
        await DispatchKanbanLembreteService(
          tid,
          q.companyId,
          { tipo: "prazo_proximo", dataPrazoLabel: label },
          l.id
        );
        await l.update({ ultimoDisparoAt: new Date() });
        continue;
      }

      const dias = l.diasAntecedencia != null ? Number(l.diasAntecedencia) : 1;
      const fireDate = moment(q.dataPrazo).subtract(dias, "days").format("YYYY-MM-DD");
      if (fireDate !== today) {
        continue;
      }
      if (
        l.ultimoDisparoEm &&
        moment(l.ultimoDisparoEm as unknown as Date).format("YYYY-MM-DD") === today
      ) {
        continue;
      }
      await DispatchKanbanLembreteService(
        tid,
        q.companyId,
        { tipo: "prazo_proximo", dataPrazoLabel: label },
        l.id
      );
      await l.update({ ultimoDisparoEm: today });
    }

    if (prazoStr <= today) {
      const vencidos = await TicketLembrete.findAll({
        where: {
          ticketId: tid,
          companyId: q.companyId,
          ativo: true,
          tipoGatilho: "prazo_vencido"
        }
      });
      for (const l of vencidos) {
        if (
          l.ultimoDisparoEm &&
          moment(l.ultimoDisparoEm as unknown as Date).format("YYYY-MM-DD") === today
        ) {
          continue;
        }
        await DispatchKanbanLembreteService(
          tid,
          q.companyId,
          { tipo: "prazo_vencido", dataPrazoLabel: label },
          l.id
        );
        await l.update({ ultimoDisparoEm: today });
      }
    }
  }
};

export default ProcessKanbanPrazoLembretesJob;
