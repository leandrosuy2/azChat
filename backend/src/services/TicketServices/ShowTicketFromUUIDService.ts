import Ticket from "../../models/Ticket";
import TicketQuadro from "../../models/TicketQuadro";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Tag from "../../models/Tag";
import QuadroGroup from "../../models/QuadroGroup";
import Whatsapp from "../../models/Whatsapp";
import Company from "../../models/Company";
import QueueIntegrations from "../../models/QueueIntegrations";
import { buildTicketWhereUuidOrId } from "../../helpers/FindTicketByUuidOrId";

const ticketInclude = [
  {
    model: Contact,
    as: "contact",
    attributes: [
      "id",
      "name",
      "number",
      "email",
      "profilePicUrl",
      "acceptAudioMessage",
      "active",
      "disableBot",
      "remoteJid",
      "urlPicture",
      "companyId",
      "document"
    ],
    include: [
      "extraInfo",
      {
        association: "tags",
        attributes: ["id", "name", "color", "kanban", "inboxOrder"]
      },
      {
        association: "wallets",
        attributes: ["id", "name"]
      }
    ]
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
    attributes: ["id", "name", "color", "kanban", "quadroGroupId", "inboxOrder"],
    include: [
      {
        model: QuadroGroup,
        as: "quadroGroup",
        attributes: ["id", "name"]
      }
    ]
  },
  {
    model: Whatsapp,
    as: "whatsapp",
    attributes: ["id", "name", "groupAsTicket", "greetingMediaAttachment", "facebookUserToken", "facebookUserId"]
  },
  {
    model: Company,
    as: "company",
    attributes: ["id", "name"]
  },
  {
    model: QueueIntegrations,
    as: "queueIntegration",
    attributes: ["id", "name"]
  }
] as const;

const ticketAttributes = [
  "id",
  "uuid",
  "queueId",
  "isGroup",
  "channel",
  "status",
  "contactId",
  "useIntegration",
  "lastMessage",
  "updatedAt",
  "unreadMessages",
  "companyId",
  "whatsappId",
  "imported",
  "lgpdAcceptedAt",
  "amountUsedBotQueues",
  "useIntegration",
  "integrationId",
  "userId",
  "amountUsedBotQueuesNPS",
  "lgpdSendMessageAt",
  "isBot",
  "quadroGroupId"
] as const;

function buildStandaloneTicketPayload(quadro: TicketQuadro, companyId: number): Record<string, unknown> {
  const lc = (quadro as any).linkedContact as Contact | undefined;
  const contactPlain = lc
    ? {
        id: lc.id,
        name: lc.name,
        number: lc.number,
        email: lc.email ?? "",
        profilePicUrl: lc.profilePicUrl,
        acceptAudioMessage: lc.acceptAudioMessage,
        active: lc.active,
        disableBot: lc.disableBot,
        remoteJid: lc.remoteJid,
        urlPicture: (lc as any).urlPicture,
        companyId: lc.companyId,
        document: (lc as any).document ?? null,
        extraInfo: [],
        tags: [],
        wallets: []
      }
    : {
        id: 0,
        name: "Quadro livre",
        number: "",
        email: "",
        profilePicUrl: null,
        acceptAudioMessage: true,
        active: true,
        disableBot: false,
        remoteJid: null,
        urlPicture: null,
        companyId,
        document: null,
        extraInfo: [],
        tags: [],
        wallets: []
      };

  return {
    id: -Math.abs(quadro.id),
    uuid: quadro.uuid,
    queueId: 0,
    isGroup: false,
    channel: "standalone",
    status: "open",
    contact: contactPlain,
    contactId: contactPlain.id,
    useIntegration: false,
    lastMessage: "",
    updatedAt: quadro.updatedAt,
    unreadMessages: 0,
    companyId,
    whatsappId: null,
    imported: false,
    lgpdAcceptedAt: null,
    amountUsedBotQueues: 0,
    integrationId: null,
    userId: null,
    amountUsedBotQueuesNPS: 0,
    lgpdSendMessageAt: null,
    isBot: false,
    queue: { id: 0, name: "—", color: "#9e9e9e" },
    user: { id: 0, name: "—" },
    tags: [],
    whatsapp: {
      id: 0,
      name: "—",
      groupAsTicket: false,
      greetingMediaAttachment: null,
      facebookUserToken: null,
      facebookUserId: null
    },
    company: { id: companyId, name: "" },
    queueIntegration: null,
    isStandaloneQuadro: true
  };
}

const ShowTicketUUIDService = async (uuid: string, companyId: number): Promise<Ticket | Record<string, unknown>> => {
  const trimmed = String(uuid || "").trim();

  const ticket = await Ticket.findOne({
    where: buildTicketWhereUuidOrId(trimmed, companyId),
    attributes: [...ticketAttributes],
    include: [...ticketInclude] as any
  });

  if (ticket) {
    return ticket;
  }

  const quadro = await TicketQuadro.findOne({
    where: { uuid: trimmed, companyId },
    include: [
      {
        model: Contact,
        as: "linkedContact",
        attributes: [
          "id",
          "name",
          "number",
          "email",
          "profilePicUrl",
          "acceptAudioMessage",
          "active",
          "disableBot",
          "remoteJid",
          "urlPicture",
          "companyId",
          "document"
        ],
        include: [
          "extraInfo",
          {
            association: "tags",
            attributes: ["id", "name", "color", "kanban", "inboxOrder"]
          },
          {
            association: "wallets",
            attributes: ["id", "name"]
          }
        ]
      }
    ]
  });

  if (quadro?.ticketId) {
    const linked = await Ticket.findOne({
      where: { id: quadro.ticketId, companyId },
      attributes: [...ticketAttributes],
      include: [...ticketInclude] as any
    });
    if (linked) {
      return linked;
    }
  }

  if (quadro && !quadro.ticketId) {
    return buildStandaloneTicketPayload(quadro, companyId);
  }

  throw new AppError("ERR_NO_TICKET_FOUND", 404);
};

export default ShowTicketUUIDService;
