import { Op, fn, where, col, Filterable, Includeable, literal } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import User from "../../models/User";
import ShowUserService from "../UserServices/ShowUserService";
import Tag from "../../models/Tag";

import { intersection } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import ContactTag from "../../models/ContactTag";
import TicketTag from "../../models/TicketTag";

import removeAccents from "remove-accents";

import FindCompanySettingOneService from "../CompaniesSettings/FindCompanySettingOneService";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  date?: string;
  dateStart?: string;
  dateEnd?: string;
  updatedAt?: string;
  showAll?: string;
  userId: number;
  withUnreadMessages?: string;
  queueIds: number[];
  tags: number[];
  users: number[];
  contacts?: string[];
  updatedStart?: string;
  updatedEnd?: string;
  connections?: string[];
  whatsappIds?: number[];
  statusFilters?: string[];
  queuesFilter?: string[];
  isGroup?: string;
  companyId: number;
  allTicket?: string;
  sortTickets?: string;
  searchOnMessages?: string;
  /** Só tickets com mensagens não lidas (combina com a aba atual) */
  unreadOnly?: string;
  /** Só conversas de grupo WhatsApp */
  groupsOnly?: string;
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

/** JOINs e tickets ativos reabertos podem repetir a mesma conversa na listagem. */
const ticketConversationKey = (ticket: Ticket): string | null => {
  const whatsappId = Number(ticket.whatsappId);
  const channel = ticket.channel || (ticket as any).contact?.channel || (ticket as any).whatsapp?.channel || "whatsapp";
  const groupFlag = ticket.isGroup ? "group" : "contact";
  const companyId = Number(ticket.companyId || (ticket as any).contact?.companyId);
  const contactWhatsappId = Number((ticket as any).contact?.whatsappId);
  const whatsappAssociationId = Number((ticket as any).whatsapp?.id);
  const effectiveWhatsappId = Number.isFinite(whatsappId)
    ? whatsappId
    : Number.isFinite(whatsappAssociationId)
      ? whatsappAssociationId
      : contactWhatsappId;
  const companyKey = Number.isFinite(companyId) ? companyId : "no-company";
  const connectionKey = Number.isFinite(effectiveWhatsappId) ? effectiveWhatsappId : "no-whatsapp";
  const contact = (ticket as any).contact;
  const remoteJid =
    typeof contact?.remoteJid === "string"
      ? contact.remoteJid.trim().toLowerCase()
      : "";
  const number =
    typeof contact?.number === "string"
      ? contact.number.replace(/\D/g, "")
      : "";
  const contactId = Number(ticket.contactId);
  const contactKey =
    remoteJid ||
    number ||
    (Number.isFinite(contactId) ? `contact:${contactId}` : "");

  if (!contactKey) return null;

  return `${companyKey}:${channel}:${connectionKey}:${groupFlag}:${contactKey}`;
};

const dedupeTicketsByConversation = (tickets: Ticket[]): Ticket[] => {
  const byConversation = new Map<string | number, Ticket>();
  for (const ticket of tickets) {
    const ticketId = Number(ticket.id);
    const key =
      ticketConversationKey(ticket) ||
      (Number.isFinite(ticketId) ? ticketId : null);
    if (key == null) continue;
    if (!byConversation.has(key)) {
      byConversation.set(key, ticket);
    }
  }
  return Array.from(byConversation.values());
};

const ListTicketsService = async ({
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
  withUnreadMessages = "false",
  whatsappIds,
  statusFilters,
  companyId,
  sortTickets = "DESC",
  searchOnMessages = "false",
  unreadOnly = "false",
  groupsOnly = "false"
}: Request): Promise<Response> => {
  const user = await ShowUserService(userId, companyId);

  const showTicketAllQueues = user.allHistoric === "enabled";
  const showTicketWithoutQueue =
    user.allTicket === "enable" || user.allTicket === "enabled";
  const showGroups = user.allowGroup === true;
  const showPendingNotification = await FindCompanySettingOneService({ companyId, column: "showNotificationPending" });
  const showNotificationPendingValue = showPendingNotification[0].showNotificationPending;
  const userQueueIds = (user.queues || []).map((queue) => queue.id);
  const effectiveQueueIds = queueIds.length > 0 ? queueIds : userQueueIds;
  const queueScopeForList =
    effectiveQueueIds.length === 0
      ? {}
      : {
          queueId: showTicketWithoutQueue
            ? { [Op.or]: [effectiveQueueIds, null] }
            : { [Op.in]: effectiveQueueIds }
        };

    let whereCondition: Filterable["where"];

  whereCondition = {
    [Op.or]: [{ userId }, { status: "pending" }],
    ...queueScopeForList,
    companyId
  };


  let includeCondition: Includeable[];

  includeCondition = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "email", "profilePicUrl", "acceptAudioMessage", "active", "urlPicture", "companyId", "channel", "whatsappId", "remoteJid"],
      include: ["extraInfo", "tags"]
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
      attributes: ["id", "name", "channel", "expiresTicket", "groupAsTicket"]
    },
  ];

  if (status === "open") {
    whereCondition =
      effectiveQueueIds.length === 0
        ? { companyId }
        : {
            companyId,
            queueId: showTicketWithoutQueue
              ? { [Op.or]: [effectiveQueueIds, null] }
              : { [Op.in]: effectiveQueueIds }
          };
  } else
    if (status === "group" && user.allowGroup && user.whatsappId) {
      whereCondition = {
        companyId,
        ...(effectiveQueueIds.length > 0
          ? { queueId: { [Op.or]: [effectiveQueueIds, null] } }
          : {}),
        whatsappId: user.whatsappId
      };
    }
    else
      if (status === "group" && (user.allowGroup) && !user.whatsappId) {
        whereCondition = {
          companyId,
          ...(effectiveQueueIds.length > 0
            ? { queueId: { [Op.or]: [effectiveQueueIds, null] } }
            : {}),
        };
      }

  if (showAll === "true" && status !== "search") {
    if (user.allHistoric === "enabled" && showTicketWithoutQueue) {
      whereCondition = { companyId };
    } else if (user.allHistoric === "enabled" && !showTicketWithoutQueue) {
      whereCondition = { companyId, queueId: { [Op.ne]: null } };
    } else if (user.allHistoric === "disabled" && showTicketWithoutQueue) {
      whereCondition =
        effectiveQueueIds.length === 0
          ? { companyId }
          : { companyId, queueId: { [Op.or]: [effectiveQueueIds, null] } };
    } else if (user.allHistoric === "disabled" && !showTicketWithoutQueue) {
      whereCondition =
        effectiveQueueIds.length === 0
          ? { companyId, queueId: { [Op.ne]: null } }
          : { companyId, queueId: { [Op.in]: effectiveQueueIds } };
    }
  }


  if (status && status !== "search") {
    whereCondition = {
      ...whereCondition,
      status: showAll === "true" && status === "pending" ? { [Op.or]: [status, "lgpd"] } : status
    };
  }


  if (status === "closed") {
    let latestTickets;

    if (!showTicketAllQueues) {
      let whereCondition2: Filterable["where"] = {
        companyId,
        status: "closed",
      }

      if (showAll === "false" && user.profile === "admin") {
        whereCondition2 = {
          ...whereCondition2,
          ...(effectiveQueueIds.length > 0 ? { queueId: effectiveQueueIds } : {}),
          userId
        }
      } else {
        whereCondition2 = {
          ...whereCondition2,
          ...(effectiveQueueIds.length > 0
            ? {
                queueId:
                  showAll === "true" || showTicketWithoutQueue
                    ? { [Op.or]: [effectiveQueueIds, null] }
                    : { [Op.in]: effectiveQueueIds }
              }
            : {}),
        }
      }

      latestTickets = await Ticket.findAll({
        attributes: ['companyId', 'contactId', 'whatsappId', [literal('MAX("id")'), 'id']],
        where: whereCondition2,
        group: ['companyId', 'contactId', 'whatsappId'],
      });

    } else {
      let whereCondition2: Filterable["where"] = {
        companyId,
        status: "closed",
      }

      if (showAll === "false" && (user.profile === "admin" || user.allUserChat === "enabled")) {
        whereCondition2 = {
          ...whereCondition2,
          ...(effectiveQueueIds.length > 0 ? { queueId: effectiveQueueIds } : {}),
          userId
        }
      } else {
        whereCondition2 = {
          ...whereCondition2,
          ...(effectiveQueueIds.length > 0
            ? {
                queueId:
                  showAll === "true" || showTicketWithoutQueue
                    ? { [Op.or]: [effectiveQueueIds, null] }
                    : { [Op.in]: effectiveQueueIds }
              }
            : {}),
        }
      }

      latestTickets = await Ticket.findAll({
        attributes: ['companyId', 'contactId', 'whatsappId', [literal('MAX("id")'), 'id']],
        where: whereCondition2,
        group: ['companyId', 'contactId', 'whatsappId'],
      });

    }

    const ticketIds = latestTickets.map((t) => t.id);

    whereCondition = {
      id: ticketIds

    };
  }
  else
    if (status === "search") {
      // Busca só mostra atendimentos em curso: ATENDENDO (open), AGUARDANDO (pending) e Grupos.
      // Histórico (closed/nps/lgpd) fica de fora — pode entrar futuramente em uma view dedicada.
      const ACTIVE_SEARCH_STATUSES = ["pending", "open", "group"];

      const latestTickets = await Ticket.findAll({
        attributes: ['companyId', 'contactId', 'whatsappId', [literal('MAX("id")'), 'id']],
        where: {
          companyId,
          status: ACTIVE_SEARCH_STATUSES
        },
        group: ['companyId', 'contactId', 'whatsappId'],
      });

      const ticketIds = latestTickets.map((t) => t.id);

      whereCondition = {
        companyId,
        id: ticketIds,
        status: ACTIVE_SEARCH_STATUSES
      };

      // if (date) {
      //   whereCondition = {
      //     createdAt: {
      //       [Op.between]: [+startOfDay(parseISO(date)), +endOfDay(parseISO(date))]
      //     }
      //   };
      // }

      // if (dateStart && dateEnd) {
      //   whereCondition = {
      //     updatedAt: {
      //       [Op.between]: [+startOfDay(parseISO(dateStart)), +endOfDay(parseISO(dateEnd))]
      //     }
      //   };
      // }

      // if (updatedAt) {
      //   whereCondition = {
      //     updatedAt: {
      //       [Op.between]: [
      //         +startOfDay(parseISO(updatedAt)),
      //         +endOfDay(parseISO(updatedAt))
      //       ]
      //     }
      //   };
      // }


      if (searchParam) {
        const sanitizedSearchParam = removeAccents(searchParam.toLocaleLowerCase().trim());
        if (searchOnMessages === "true") {
          includeCondition = [
            ...includeCondition,
            {
              model: Message,
              as: "messages",
              attributes: ["id", "body"],
              where: {
                body: where(
                  fn("LOWER", fn('unaccent', col("messages.body"))),
                  "LIKE",
                  `%${sanitizedSearchParam}%`
                ),
                // ticketId: 
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
                  fn("LOWER", fn("unaccent", col("contact.name"))),
                  "LIKE",
                  `%${sanitizedSearchParam}%`
                )
              },
              { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } },
              {
                "$messages.body$": where(
                  fn("LOWER", fn("unaccent", col("messages.body"))),
                  "LIKE",
                  `%${sanitizedSearchParam}%`
                )
              }
            ]
          };
        } else {
          whereCondition = {
            ...whereCondition,
            [Op.or]: [
              {
                "$contact.name$": where(
                  fn("LOWER", fn("unaccent", col("contact.name"))),
                  "LIKE",
                  `%${sanitizedSearchParam}%`
                )
              },
              { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } },
              // {
              //   "$message.body$": where(
              //     fn("LOWER", fn("unaccent", col("body"))),
              //     "LIKE",
              //     `%${sanitizedSearchParam}%`
              //   )
              // }
            ]
          };
        }

      }

      if (Array.isArray(tags) && tags.length > 0) {
        const contactTagFilter: any[] | null = [];
        // for (let tag of tags) {
        const contactTags = await ContactTag.findAll({
          where: { tagId: tags }
        });
        if (contactTags) {
          contactTagFilter.push(contactTags.map(t => t.contactId));
        }
        // }

        const contactsIntersection: number[] = intersection(...contactTagFilter);

        whereCondition = {
          ...whereCondition,
          contactId: contactsIntersection
        };
      }

      if (Array.isArray(users) && users.length > 0) {
        whereCondition = {
          ...whereCondition,
          userId: users
        };
      }


      if (Array.isArray(whatsappIds) && whatsappIds.length > 0) {
        whereCondition = {
          ...whereCondition,
          whatsappId: whatsappIds
        };
      }

      if (Array.isArray(statusFilters) && statusFilters.length > 0) {
        whereCondition = {
          ...whereCondition,
          status: { [Op.in]: statusFilters }
        };
      }

    } else
      if (withUnreadMessages === "true") {
        // console.log(showNotificationPendingValue)
        whereCondition = {
          [Op.or]: [
            {
              userId,
              status: showNotificationPendingValue ? { [Op.notIn]: ["closed", "lgpd", "nps"] } : { [Op.notIn]: ["pending", "closed", "lgpd", "nps", "group"] },
              queueId: { [Op.in]: userQueueIds },
              unreadMessages: { [Op.gt]: 0 },
              companyId,
              isGroup: showGroups ? { [Op.or]: [true, false] } : false
            },
            {
              status: showNotificationPendingValue ? { [Op.in]: ["pending", "group"] } : { [Op.in]: ["group"] },
              queueId: showTicketWithoutQueue ? { [Op.or]: [userQueueIds, null] } : { [Op.or]: [userQueueIds] },
              unreadMessages: { [Op.gt]: 0 },
              companyId,
              isGroup: showGroups ? { [Op.or]: [true, false] } : false
            }
          ]
        };

      if (status === "group" && (user.allowGroup || showAll === "true")) {
        whereCondition = {
          ...whereCondition,
          queueId: { [Op.or]: [userQueueIds, null] },
        };
      }
    }

  if (searchParam && status !== "search") {
    const sanitizedSearchParam = removeAccents(searchParam.toLocaleLowerCase().trim());
    const searchOrConditions: any[] = [
      {
        "$contact.name$": where(
          fn("LOWER", fn("unaccent", col("contact.name"))),
          "LIKE",
          `%${sanitizedSearchParam}%`
        )
      },
      { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } }
    ];

    if (searchOnMessages === "true") {
      includeCondition = [
        ...includeCondition,
        {
          model: Message,
          as: "messages",
          attributes: ["id", "body"],
          where: {
            body: where(
              fn("LOWER", fn("unaccent", col("messages.body"))),
              "LIKE",
              `%${sanitizedSearchParam}%`
            )
          },
          required: false,
          duplicating: false
        }
      ];

      searchOrConditions.push({
        "$messages.body$": where(
          fn("LOWER", fn("unaccent", col("messages.body"))),
          "LIKE",
          `%${sanitizedSearchParam}%`
        )
      });
    }

    whereCondition = {
      [Op.and]: [
        whereCondition,
        { [Op.or]: searchOrConditions }
      ]
    };
  }

  if (Array.isArray(tags) && tags.length > 0 && status !== "search") {
    const contactTagsRows = await ContactTag.findAll({
      where: { tagId: { [Op.in]: tags } }
    });
    const contactIdsFromTags = [...new Set(contactTagsRows.map(t => t.contactId))];

    const ticketTagsRows = await TicketTag.findAll({
      where: { tagId: { [Op.in]: tags } }
    });
    const ticketIdsFromTags = [...new Set(ticketTagsRows.map(t => t.ticketId))];

    if (contactIdsFromTags.length === 0 && ticketIdsFromTags.length === 0) {
      whereCondition = { ...whereCondition, id: { [Op.in]: [-1] } };
    } else {
      const orOperands: Record<string, unknown>[] = [];
      if (contactIdsFromTags.length > 0) {
        orOperands.push({ contactId: { [Op.in]: contactIdsFromTags } });
      }
      if (ticketIdsFromTags.length > 0) {
        orOperands.push({ id: { [Op.in]: ticketIdsFromTags } });
      }
      whereCondition = {
        [Op.and]: [whereCondition, { [Op.or]: orOperands }]
      };
    }
  }

  if (unreadOnly === "true") {
    whereCondition = {
      ...whereCondition,
      unreadMessages: { [Op.gt]: 0 }
    };
  }

  if (groupsOnly === "true") {
    whereCondition = {
      ...whereCondition,
      isGroup: true
    };
  }

  whereCondition = {
    ...whereCondition,
    companyId
  };

  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: ticketRows } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    attributes: ["id", "uuid", "userId", "queueId", "isGroup", "channel", "status", "contactId", "whatsappId", "companyId", "useIntegration", "lastMessage", "updatedAt", "unreadMessages"],
    distinct: true,
    limit,
    offset,
    order: [["updatedAt", sortTickets]],
    subQuery: false
  });

  const tickets = dedupeTicketsByConversation(ticketRows);
  const hasMore = count > offset + tickets.length;

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsService;
