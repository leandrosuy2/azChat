import { Op, fn, where, col, Filterable, Includeable } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import User from "../../models/User";
import ShowUserService from "../UserServices/ShowUserService";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";
import { intersection } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import TicketQuadroAnexo from "../../models/TicketQuadroAnexo";
import TicketQuadro from "../../models/TicketQuadro";
import QuadroGroup from "../../models/QuadroGroup";
import { quadroAttachmentPublicUrl } from "../../helpers/QuadroAttachmentPaths";
import {
  applyUnlinkedMirrorToDisplayFields,
  batchFetchUnlinkedMirrorByQuadroId,
  type UnlinkedMirrorPayload
} from "../../helpers/UnlinkedMirrorQuadro";

export type KanbanQuadroProcessoAttachment = {
  id: number;
  name: string;
  url: string;
  processoBlocoId: string;
};

/** sharedGroupIds no banco pode vir como JSON com números ou strings — normaliza para comparação. */
function sharedGroupIdsAsNumbers(raw: unknown): number[] {
  if (raw == null) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      arr = Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  } else {
    return [];
  }
  return arr.map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

function sharedGroupIdsInclude(raw: unknown, groupIdNum: number): boolean {
  return sharedGroupIdsAsNumbers(raw).includes(groupIdNum);
}

function buildStandaloneKanbanCard(
  q: TicketQuadro,
  companyId: number,
  listViewGroupId: number | null,
  unlinkedBlob?: Record<string, UnlinkedMirrorPayload> | null
): Record<string, unknown> {
  const rowForMerge = {
    nomeProjeto: q.nomeProjeto ?? null,
    status: q.status,
    description: q.description ?? null,
    valorServico: q.valorServico != null ? Number(q.valorServico) : null,
    valorEntrada: q.valorEntrada != null ? Number(q.valorEntrada) : null,
    customFields: q.customFields ?? [],
    dataPrazo: q.dataPrazo ?? null,
    detalhesProcesso: q.detalhesProcesso ?? null,
    detalhesProcessoItens: q.detalhesProcessoItens ?? [],
    linkType: q.linkType ?? "linked",
    sharedGroupIds: q.sharedGroupIds ?? [],
    quadroGroupId: q.quadroGroupId != null ? Number(q.quadroGroupId) : null,
    unlinkedMirrorDataByGroup: unlinkedBlob ?? {}
  };
  const disp = applyUnlinkedMirrorToDisplayFields(rowForMerge, listViewGroupId);

  const lc = (q as any).linkedContact as Contact | undefined;
  const contact = lc
    ? {
        id: lc.id,
        name: lc.name,
        number: lc.number,
        profilePicUrl: lc.profilePicUrl,
        urlPicture: (lc as any).urlPicture
      }
    : { id: 0, name: "Quadro livre", number: "", profilePicUrl: null, urlPicture: null };

  const tags = q.kanbanTagId ? [{ id: q.kanbanTagId, name: "", color: "" }] : [];

  return {
    id: -q.id,
    uuid: q.uuid,
    isStandaloneQuadro: true,
    status: "open",
    updatedAt: q.updatedAt,
    createdAt: q.createdAt,
    companyId,
    /** Quadro “de casa” do cartão (para coluna ao compartilhar em outra área) */
    quadroHomeGroupId: q.quadroGroupId != null ? Number(q.quadroGroupId) : null,
    contact,
    queue: { id: 0, name: "—", color: "#9e9e9e" },
    user: { id: 0, name: "—" },
    whatsapp: { id: 0, name: "—" },
    tags,
    nomeProjeto: disp.nomeProjeto,
    quadroNomeProjeto: disp.nomeProjeto,
    quadroValorServico: disp.valorServico,
    quadroValorEntrada: disp.valorEntrada,
    quadroCustomFields: disp.customFields ?? [],
    quadroSharedGroupIds: q.sharedGroupIds ?? [],
    quadroLinkType: q.linkType ?? "linked",
    quadroSharedStagesByGroup: q.sharedStagesByGroup ?? {},
    quadroEtapaStatus: disp.status != null ? String(disp.status) : null,
    quadroCapaUrl: null,
    ticketQuadroId: q.id,
    quadroProcessoAttachments: [] as KanbanQuadroProcessoAttachment[],
    unreadMessages: 0,
    lastMessage: ""
  };
}

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  date?: string;
  dateStart?: string;
  dateEnd?: string;
  updatedAt?: string;
  showAll?: string;
  userId: string;
  withUnreadMessages?: string;
  queueIds: number[];
  tags: number[];
  users: number[];
  companyId: number;
  quadroGroupId?: number | string;
  contactId?: number | string;
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const ListTicketsServiceKanban = async ({
  searchParam = "",
  pageNumber = "1",
  queueIds,
  tags,
  users,
  status,
  date,
  dateStart,
  dateEnd,
  updatedAt,
  showAll,
  userId,
  withUnreadMessages,
  companyId,
  quadroGroupId,
  contactId
}: Request): Promise<Response> => {
  const contactIdNum =
    contactId != null && contactId !== ""
      ? typeof contactId === "string"
        ? parseInt(contactId, 10)
        : Number(contactId)
      : NaN;
  const contactIdFilter = Number.isFinite(contactIdNum) ? contactIdNum : null;
  const listViewGroupNum =
    quadroGroupId != null && quadroGroupId !== ""
      ? typeof quadroGroupId === "string"
        ? parseInt(String(quadroGroupId), 10)
        : Number(quadroGroupId)
      : NaN;
  const listViewGroupIdGlobal = Number.isFinite(listViewGroupNum) ? listViewGroupNum : null;

  console.log("[Kanban API] ListTicketsServiceKanban entrada", {
    companyId,
    userId,
    quadroGroupId,
    queueIdsLen: queueIds?.length,
    tagsLen: tags?.length,
    usersLen: users?.length,
    pageNumber,
    searchParam: searchParam ? String(searchParam).slice(0, 80) : "",
    dateStart: dateStart || "",
    dateEnd: dateEnd || "",
    withUnreadMessages: withUnreadMessages || ""
  });

  const user = await ShowUserService(userId, companyId);
  const showTicketWithoutQueue = user.allTicket === "enable";
  const userQueueIds = user.queues.map((queue) => queue.id);
  const effectiveQueueIds = queueIds.length > 0 ? queueIds : userQueueIds;
  const seesAllCompanyKanban =
    String(user.profile).toLowerCase() === "admin" ||
    user.super === true ||
    user.allUserChat === "enabled";

  let whereCondition: Filterable["where"];
  if (seesAllCompanyKanban) {
    whereCondition = {};
  } else {
    whereCondition = {
      queueId: showTicketWithoutQueue
        ? { [Op.or]: [effectiveQueueIds, null] }
        : { [Op.in]: effectiveQueueIds }
    };
  }
  let includeCondition: Includeable[];

  includeCondition = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "email", "companyId", "urlPicture", "profilePicUrl"]
    },
    {
      model: Queue,
      as: "queue",
      attributes: ["id", "name", "color"]
    },
    {
      model: User,
      as: "user",
      attributes: ["id", "name"]
    },
    {
      model: Tag,
      as: "tags",
      attributes: ["id", "name", "color"]
    },
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["name"]
    },
  ];

  if (showAll === "true" && !seesAllCompanyKanban) {
    whereCondition = {
      queueId: showTicketWithoutQueue
        ? { [Op.or]: [effectiveQueueIds, null] }
        : { [Op.in]: effectiveQueueIds }
    };
  }

  whereCondition = {
    ...whereCondition,
    status: { [Op.or]: ["pending", "open"] }
  };

  if (contactIdFilter != null) {
    whereCondition = {
      ...whereCondition,
      contactId: contactIdFilter
    };
  }

  if (searchParam) {
    const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();

    includeCondition = [
      ...includeCondition,
      {
        model: Message,
        as: "messages",
        attributes: ["id", "body"],
        where: {
          body: where(
            fn("LOWER", col("body")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        required: false,
        duplicating: false
      }
    ];

    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        {
          "$contact.name$": where(
            fn("LOWER", col("contact.name")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } },
        {
          "$message.body$": where(
            fn("LOWER", col("body")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        }
      ]
    };
  }

  if (dateStart && dateEnd) {
    whereCondition = {
      ...whereCondition,
      createdAt: {
        [Op.between]: [+startOfDay(parseISO(dateStart)), +endOfDay(parseISO(dateEnd))]
      }
    };
  }

  if (updatedAt) {
    whereCondition = {
      ...whereCondition,
      updatedAt: {
        [Op.between]: [
          +startOfDay(parseISO(updatedAt)),
          +endOfDay(parseISO(updatedAt))
        ]
      }
    };
  }

  if (withUnreadMessages === "true") {
    if (seesAllCompanyKanban) {
      whereCondition = {
        unreadMessages: { [Op.gt]: 0 },
        status: { [Op.or]: ["pending", "open"] }
      };
    } else {
      const unreadQueueIds = queueIds.length > 0 ? queueIds : userQueueIds;
      whereCondition = {
        queueId: showTicketWithoutQueue
          ? { [Op.or]: [unreadQueueIds, null] }
          : { [Op.in]: unreadQueueIds },
        unreadMessages: { [Op.gt]: 0 },
        status: { [Op.or]: ["pending", "open"] }
      };
    }
  }

  if (Array.isArray(tags) && tags.length > 0) {
    const ticketsTagFilter: any[] | null = [];
    for (let tag of tags) {
      const ticketTags = await TicketTag.findAll({
        where: { tagId: tag }
      });
      if (ticketTags) {
        ticketsTagFilter.push(ticketTags.map(t => t.ticketId));
      }
    }

    const ticketsIntersection: number[] = intersection(...ticketsTagFilter);

    whereCondition = {
      ...whereCondition,
      id: {
        [Op.in]: ticketsIntersection
      }
    };
  }

  if (Array.isArray(users) && users.length > 0) {
    const ticketsUserFilter: any[] | null = [];
    for (let user of users) {
      const ticketUsers = await Ticket.findAll({
        where: { userId: user }
      });
      if (ticketUsers) {
        ticketsUserFilter.push(ticketUsers.map(t => t.id));
      }
    }

    const ticketsIntersection: number[] = intersection(...ticketsUserFilter);

    whereCondition = {
      ...whereCondition,
      id: {
        [Op.in]: ticketsIntersection
      }
    };
  }

  const limit = 400;
  const offset = limit * (+pageNumber - 1);

  whereCondition = {
    ...whereCondition,
    companyId
  };

  if (quadroGroupId != null && quadroGroupId !== "") {
    const groupIdNum = typeof quadroGroupId === "string" ? parseInt(quadroGroupId, 10) : quadroGroupId;
    if (!isNaN(groupIdNum)) {
      const ticketsInGroup = await Ticket.findAll({
        where: { companyId, quadroGroupId: groupIdNum },
        attributes: ["id"]
      });
      const ticketIdsMain = ticketsInGroup.map((t) => t.id);
      const quadrosAll = await TicketQuadro.findAll({
        where: { companyId },
        attributes: ["ticketId", "quadroGroupId", "sharedGroupIds"]
      });
      // Nunca incluir ticketId null (quadros livres) no IN — quebra o WHERE e pode zerar a lista.
      const ticketIdsFromQuadroMain = quadrosAll
        .filter((q) => q.quadroGroupId === groupIdNum && q.ticketId != null)
        .map((q) => q.ticketId as number);
      const ticketIdsShared = quadrosAll
        .filter(
          (q) => q.ticketId != null && sharedGroupIdsInclude(q.sharedGroupIds, groupIdNum)
        )
        .map((q) => q.ticketId as number);
      /** Tickets sem área (quadroGroupId null) só entram na primeira área da empresa.
       * Incluir em todas as áreas repetia os mesmos cards e “poluía” áreas novas. */
      const firstGroup = await QuadroGroup.findOne({
        where: { companyId },
        order: [["createdAt", "ASC"]],
        attributes: ["id"]
      });
      const firstGroupId = firstGroup?.id != null ? Number(firstGroup.id) : null;
      const includeOrphans =
        firstGroupId != null && !Number.isNaN(firstGroupId) && groupIdNum === firstGroupId;

      let orphanIds: number[] = [];
      if (includeOrphans) {
        const orphanTickets = await Ticket.findAll({
          where: {
            companyId,
            quadroGroupId: null,
            status: { [Op.or]: ["pending", "open"] }
          },
          attributes: ["id"]
        });
        orphanIds = orphanTickets.map((t) => t.id);
      }

      const allTicketIds = [
        ...new Set([
          ...ticketIdsMain,
          ...ticketIdsFromQuadroMain,
          ...ticketIdsShared,
          ...orphanIds
        ])
      ]
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n) && n > 0);
      console.log("[Kanban API] filtro por área (quadroGroupId)", {
        groupIdNum,
        lenMain: ticketIdsMain.length,
        lenFromQuadroMain: ticketIdsFromQuadroMain.length,
        lenShared: ticketIdsShared.length,
        lenOrphans: orphanIds.length,
        allTicketIdsLen: allTicketIds.length,
        allTicketIdsSample: allTicketIds.slice(0, 20),
        modoId:
          allTicketIds.length === 0
            ? "id:-1 (nenhum ticket nesta combinação; quadros livres podem existir)"
            : "Op.in(allTicketIds)"
      });
      // Sem tickets nesta área mas pode haver quadros livres — não retornar cedo; usar filtro impossível para tickets.
      if (allTicketIds.length === 0) {
        whereCondition = {
          ...whereCondition,
          id: -1
        };
      } else {
        whereCondition = {
          ...whereCondition,
          id: { [Op.in]: allTicketIds }
        };
      }
    }
  }

  console.log("[Kanban API] where resumo", {
    keys: Object.keys(whereCondition || {}),
    status: (whereCondition as any)?.status,
    companyId: (whereCondition as any)?.companyId
  });

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    distinct: true,
    limit,
    offset,
    order: [["updatedAt", "DESC"]],
    subQuery: false
  });
  const hasMore = count > offset + tickets.length;

  console.log("[Kanban API] findAndCountAll", {
    count,
    rowsLen: tickets.length,
    offset,
    limit,
    hasMore
  });

  const ticketIds = tickets.map((t: Ticket) => t.id);
  const baseUrl = `${process.env.BACKEND_URL}${process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""}`;
  const capaMap: Record<number, string> = {};
  if (ticketIds.length > 0) {
    const capas = await TicketQuadroAnexo.findAll({
      where: { ticketId: { [Op.in]: ticketIds }, isCapa: true },
      attributes: ["ticketId", "path"]
    });
    capas.forEach((c: TicketQuadroAnexo) => {
      capaMap[c.ticketId] = `${baseUrl}/public/company${companyId}/quadro/${c.ticketId}/${c.path}`;
    });
  }

  const procByTicketId: Record<number, KanbanQuadroProcessoAttachment[]> = {};
  if (ticketIds.length > 0) {
    const procRows = await TicketQuadroAnexo.findAll({
      where: {
        ticketId: { [Op.in]: ticketIds },
        processoBlocoId: { [Op.ne]: null }
      },
      attributes: ["id", "ticketId", "name", "path", "processoBlocoId"],
      order: [["createdAt", "ASC"]]
    });
    procRows.forEach((a: TicketQuadroAnexo) => {
      const bid = (a.processoBlocoId && String(a.processoBlocoId).trim()) || "";
      if (!bid || a.ticketId == null) return;
      const url = quadroAttachmentPublicUrl(companyId, a.path, {
        ticketId: a.ticketId,
        ticketQuadroId: null
      });
      if (!procByTicketId[a.ticketId]) procByTicketId[a.ticketId] = [];
      procByTicketId[a.ticketId].push({
        id: a.id,
        name: a.name,
        url,
        processoBlocoId: bid
      });
    });
  }

  const quadroMap: Record<
    number,
    {
      nomeProjeto: string | null;
      valorServico: number | null;
      valorEntrada: number | null;
      customFields: any[];
      sharedGroupIds: number[];
      quadroStatus: string | null;
      linkType: string;
      sharedStagesByGroup: Record<string, number[]>;
      quadroHomeGroupId: number | null;
    }
  > = {};
  if (ticketIds.length > 0) {
    const quadros = await TicketQuadro.findAll({
      where: { ticketId: { [Op.in]: ticketIds } },
      attributes: [
        "ticketId",
        "nomeProjeto",
        "valorServico",
        "valorEntrada",
        "customFields",
        "sharedGroupIds",
        "status",
        "linkType",
        "sharedStagesByGroup",
        "quadroGroupId"
      ]
    });
    const quadroIdsForUnlinked = quadros.map((q: TicketQuadro) => q.id);
    const unlinkedByQuadroId = await batchFetchUnlinkedMirrorByQuadroId(
      quadroIdsForUnlinked,
      companyId
    );
    quadros.forEach((q: TicketQuadro) => {
      const base = {
        nomeProjeto: q.nomeProjeto ?? null,
        valorServico: q.valorServico != null ? Number(q.valorServico) : null,
        valorEntrada: q.valorEntrada != null ? Number(q.valorEntrada) : null,
        customFields: q.customFields ?? [],
        status: q.status != null ? String(q.status) : null,
        description: q.description ?? null,
        dataPrazo: q.dataPrazo ?? null,
        detalhesProcesso: q.detalhesProcesso ?? null,
        detalhesProcessoItens: q.detalhesProcessoItens ?? [],
        linkType: q.linkType ?? "linked",
        sharedGroupIds: q.sharedGroupIds ?? [],
        quadroGroupId: q.quadroGroupId != null ? Number(q.quadroGroupId) : null,
        unlinkedMirrorDataByGroup: unlinkedByQuadroId[q.id] ?? {}
      };
      const disp = applyUnlinkedMirrorToDisplayFields(base, listViewGroupIdGlobal);
      quadroMap[q.ticketId] = {
        nomeProjeto: disp.nomeProjeto ?? null,
        valorServico: disp.valorServico,
        valorEntrada: disp.valorEntrada,
        customFields: disp.customFields ?? [],
        sharedGroupIds: q.sharedGroupIds ?? [],
        quadroStatus: disp.status != null ? String(disp.status) : null,
        linkType: q.linkType ?? "linked",
        sharedStagesByGroup: q.sharedStagesByGroup ?? {},
        quadroHomeGroupId:
          q.quadroGroupId != null ? Number(q.quadroGroupId) : null
      };
    });
  }

  tickets.forEach((t: any) => {
    t.setDataValue("quadroCapaUrl", capaMap[t.id] || null);
    t.setDataValue("quadroProcessoAttachments", procByTicketId[t.id] || []);
    const q = quadroMap[t.id];
    if (q) {
      t.setDataValue("nomeProjeto", q.nomeProjeto);
      t.setDataValue("quadroValorServico", q.valorServico);
      t.setDataValue("quadroValorEntrada", q.valorEntrada);
      t.setDataValue("quadroCustomFields", q.customFields);
      t.setDataValue("quadroSharedGroupIds", q.sharedGroupIds);
      t.setDataValue("quadroEtapaStatus", q.quadroStatus);
      t.setDataValue("quadroLinkType", q.linkType);
      t.setDataValue("quadroSharedStagesByGroup", q.sharedStagesByGroup);
      t.setDataValue("quadroHomeGroupId", q.quadroHomeGroupId);
    } else {
      t.setDataValue("nomeProjeto", null);
      t.setDataValue("quadroValorServico", null);
      t.setDataValue("quadroValorEntrada", null);
      t.setDataValue("quadroCustomFields", []);
      t.setDataValue("quadroSharedGroupIds", []);
      t.setDataValue("quadroEtapaStatus", null);
      t.setDataValue("quadroLinkType", "linked");
      t.setDataValue("quadroSharedStagesByGroup", {});
      t.setDataValue("quadroHomeGroupId", null);
    }
  });

  let mergedOut: any[] = [...tickets];
  let extraCount = 0;

  if (quadroGroupId != null && quadroGroupId !== "") {
    const groupIdNum = typeof quadroGroupId === "string" ? parseInt(String(quadroGroupId), 10) : Number(quadroGroupId);
    if (!Number.isNaN(groupIdNum)) {
      try {
        // Sem include: evita erro de associação/migration e não derruba o Kanban inteiro.
        const standalonesHome = await TicketQuadro.findAll({
          where: {
            companyId,
            ticketId: null,
            quadroGroupId: groupIdNum,
            ...(contactIdFilter != null
              ? { linkedContactId: contactIdFilter }
              : {})
          },
          order: [["updatedAt", "DESC"]],
          limit: 300,
          include: [
            {
              model: Contact,
              as: "linkedContact",
              attributes: [
                "id",
                "name",
                "number",
                "email",
                "companyId",
                "urlPicture",
                "profilePicUrl"
              ],
              required: false
            }
          ]
        });

        const standalonesSharedCandidates = await TicketQuadro.findAll({
          where: {
            companyId,
            ticketId: null,
            quadroGroupId: { [Op.ne]: groupIdNum },
            sharedGroupIds: { [Op.ne]: null },
            ...(contactIdFilter != null
              ? { linkedContactId: contactIdFilter }
              : {})
          },
          order: [["updatedAt", "DESC"]],
          limit: 400,
          include: [
            {
              model: Contact,
              as: "linkedContact",
              attributes: [
                "id",
                "name",
                "number",
                "email",
                "companyId",
                "urlPicture",
                "profilePicUrl"
              ],
              required: false
            }
          ]
        });
        const standalonesMirrored = standalonesSharedCandidates.filter((q) =>
          sharedGroupIdsInclude(q.sharedGroupIds, groupIdNum)
        );

        const standaloneById = new Map<number, TicketQuadro>();
        standalonesHome.forEach((q) => standaloneById.set(q.id, q));
        standalonesMirrored.forEach((q) => standaloneById.set(q.id, q));
        const standalones = Array.from(standaloneById.values()).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        extraCount = standalones.length;
        const standaloneIds = standalones.map((q) => q.id);
        const unlinkedStandalone = await batchFetchUnlinkedMirrorByQuadroId(
          standaloneIds,
          companyId
        );
        const procByQuadroId: Record<number, KanbanQuadroProcessoAttachment[]> = {};
        if (standaloneIds.length > 0) {
          const sProc = await TicketQuadroAnexo.findAll({
            where: {
              ticketQuadroId: { [Op.in]: standaloneIds },
              processoBlocoId: { [Op.ne]: null }
            },
            attributes: ["id", "ticketQuadroId", "name", "path", "processoBlocoId"],
            order: [["createdAt", "ASC"]]
          });
          sProc.forEach((a: TicketQuadroAnexo) => {
            const bid = (a.processoBlocoId && String(a.processoBlocoId).trim()) || "";
            const qid = a.ticketQuadroId;
            if (!bid || qid == null) return;
            const url = quadroAttachmentPublicUrl(companyId, a.path, {
              ticketId: null,
              ticketQuadroId: qid
            });
            if (!procByQuadroId[qid]) procByQuadroId[qid] = [];
            procByQuadroId[qid].push({
              id: a.id,
              name: a.name,
              url,
              processoBlocoId: bid
            });
          });
        }
        mergedOut = [
          ...tickets,
          ...standalones.map((q) => {
            const base = buildStandaloneKanbanCard(
              q,
              companyId,
              groupIdNum,
              unlinkedStandalone[q.id]
            ) as Record<string, unknown>;
            return {
              ...base,
              quadroProcessoAttachments: procByQuadroId[q.id] || []
            };
          })
        ];
        mergedOut.sort((a: any, b: any) => {
          const ta = new Date(a.updatedAt).getTime();
          const tb = new Date(b.updatedAt).getTime();
          return tb - ta;
        });
        console.log("[Kanban API] merge quadros livres OK", {
          groupIdNum,
          standalonesLen: standalones.length,
          mergedOutLen: mergedOut.length
        });
      } catch (standaloneErr) {
        console.error("[Kanban API] merge quadros livres ERRO (mantém só tickets)", standaloneErr);
        mergedOut = [...tickets];
        extraCount = 0;
      }
    }
  }

  console.log("[Kanban API] resposta final", {
    rowsTickets: tickets.length,
    mergedTotal: mergedOut.length,
    extraStandalone: extraCount,
    countReported: count + extraCount,
    hasMore
  });

  return {
    tickets: mergedOut,
    count: count + extraCount,
    hasMore
  };
};

export default ListTicketsServiceKanban;