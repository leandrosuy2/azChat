import TicketLembrete from "../../models/TicketLembrete";
import QuadroGroup from "../../models/QuadroGroup";
import DispatchKanbanLembreteService from "./DispatchKanbanLembreteService";

const DispatchKanbanShareLembretesService = async (
  ticketId: number,
  companyId: number,
  originGroupId: number | null,
  addedGroupIds: number[]
): Promise<void> => {
  if (!addedGroupIds.length) return;

  const rows = await TicketLembrete.findAll({
    where: {
      ticketId,
      companyId,
      ativo: true,
      tipoGatilho: "compartilhamento",
      notifyOnShare: true
    } as any
  });

  if (!rows.length) return;

  const groups = await QuadroGroup.findAll({
    where: { companyId, id: addedGroupIds },
    attributes: ["id", "name"]
  });
  const nameById = new Map(groups.map((g) => [g.id, g.name]));

  const originGroup = originGroupId
    ? await QuadroGroup.findOne({
        where: { id: originGroupId, companyId },
        attributes: ["name"]
      })
    : null;

  for (const gid of addedGroupIds) {
    const allowed = rows.filter((r) => {
      const ids = Array.isArray(r.notifyShareGroupIds)
        ? (r.notifyShareGroupIds as number[]).map(Number)
        : [];
      if (ids.length === 0) return true;
      return ids.includes(gid);
    });

    if (!allowed.length) continue;

    const targetName = nameById.get(gid) || `Área #${gid}`;
    await DispatchKanbanLembreteService(ticketId, companyId, {
      tipo: "compartilhamento",
      areaOrigem: originGroup?.name || "—",
      areaDestino: targetName,
      areaDestinoId: gid
    });
  }
};

export default DispatchKanbanShareLembretesService;
