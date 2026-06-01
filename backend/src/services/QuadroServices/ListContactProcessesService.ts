import Ticket from "../../models/Ticket";
import TicketQuadro from "../../models/TicketQuadro";
import QuadroGroup from "../../models/QuadroGroup";
import Tag from "../../models/Tag";
import { Op } from "sequelize";

interface ProcessResponse {
  groupId: number;
  groupName: string;
  count: number;
  stages: string[];
}

const ListContactProcessesService = async (
  contactId: number,
  companyId: number
): Promise<ProcessResponse[]> => {
  const firstGroup = await QuadroGroup.findOne({
    where: { companyId },
    order: [["createdAt", "ASC"]],
    attributes: ["id"]
  });
  const firstGroupId = firstGroup?.id != null ? Number(firstGroup.id) : null;

  const tickets = await Ticket.findAll({
    where: {
      contactId,
      companyId,
      status: { [Op.or]: ["pending", "open"] }
    },
    attributes: ["id", "quadroGroupId"],
    include: [
      {
        model: TicketQuadro,
        as: "quadros",
        attributes: ["quadroGroupId", "sharedGroupIds"],
        required: false
      },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "kanban", "quadroGroupId"],
        through: { attributes: [] },
        required: false
      }
    ]
  });

  const groupCountMap: Record<number, number> = {};
  const groupStagesMap: Record<number, string[]> = {};

  const addStage = (groupId: number, name: string | null | undefined) => {
    if (!name) return;
    if (!groupStagesMap[groupId]) groupStagesMap[groupId] = [];
    if (!groupStagesMap[groupId].includes(name)) {
      groupStagesMap[groupId].push(name);
    }
  };

  for (const ticket of tickets) {
    const quadro = ticket.quadros?.[0];
    const homeGroupId =
      ticket.quadroGroupId != null
        ? Number(ticket.quadroGroupId)
        : quadro?.quadroGroupId != null
          ? Number(quadro.quadroGroupId)
          : firstGroupId;
    if (homeGroupId == null) continue;
    groupCountMap[homeGroupId] = (groupCountMap[homeGroupId] || 0) + 1;

    const laneTags = (ticket.tags || []).filter((t: any) => Number(t?.kanban) === 1);
    for (const lt of laneTags) {
      const tagGroupId = lt.quadroGroupId != null ? Number(lt.quadroGroupId) : null;
      if (tagGroupId == null || tagGroupId === homeGroupId) {
        addStage(homeGroupId, lt.name);
      }
    }

    const shared = Array.isArray(quadro?.sharedGroupIds) ? quadro.sharedGroupIds : [];
    for (const gId of shared) {
      const n = Number(gId);
      if (!Number.isFinite(n) || n === homeGroupId) continue;
      groupCountMap[n] = (groupCountMap[n] || 0) + 1;
      for (const lt of laneTags) {
        const tagGroupId = lt.quadroGroupId != null ? Number(lt.quadroGroupId) : null;
        if (tagGroupId === n) {
          addStage(n, lt.name);
        }
      }
    }
  }

  // Cartões standalone (criados direto na área Kanban): não têm Ticket,
  // só TicketQuadro com linkedContactId.
  const standalones = await TicketQuadro.findAll({
    where: {
      companyId,
      linkedContactId: contactId,
      ticketId: null
    },
    attributes: ["id", "quadroGroupId", "kanbanTagId", "sharedGroupIds"],
    include: [
      {
        model: Tag,
        as: "kanbanTag",
        attributes: ["id", "name", "quadroGroupId"],
        required: false
      }
    ]
  });

  for (const sa of standalones) {
    const homeGroupId = sa.quadroGroupId != null ? Number(sa.quadroGroupId) : null;
    if (homeGroupId == null) continue;
    groupCountMap[homeGroupId] = (groupCountMap[homeGroupId] || 0) + 1;
    const tagName = (sa as any).kanbanTag?.name ?? null;
    addStage(homeGroupId, tagName);

    const shared = Array.isArray(sa.sharedGroupIds) ? sa.sharedGroupIds : [];
    for (const gId of shared) {
      const n = Number(gId);
      if (!Number.isFinite(n) || n === homeGroupId) continue;
      groupCountMap[n] = (groupCountMap[n] || 0) + 1;
    }
  }

  const groupIds = Object.keys(groupCountMap).map(Number);

  if (groupIds.length === 0) {
    return [];
  }

  const groups = await QuadroGroup.findAll({
    where: { id: { [Op.in]: groupIds }, companyId },
    attributes: ["id", "name"]
  });

  const groupNameMap: Record<number, string> = {};
  for (const g of groups) {
    groupNameMap[g.id] = g.name;
  }

  const processes: ProcessResponse[] = Object.entries(groupCountMap).map(([gId, count]) => ({
    groupId: Number(gId),
    groupName: groupNameMap[Number(gId)] || "Kanban",
    count,
    stages: groupStagesMap[Number(gId)] || []
  }));

  return processes;
};

export default ListContactProcessesService;
