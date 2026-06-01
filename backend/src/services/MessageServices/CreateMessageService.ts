import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Tag from "../../models/Tag";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";

export interface MessageData {
  wid: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  ack?: number;
  queueId?: number;
  channel?: string;
  ticketTrakingId?: number;
  isPrivate?: boolean;
  ticketImported?: any;
  isForwarded?: boolean;
}
interface Request {
  messageData: MessageData;
  companyId: number;
}

/**
 * Cria ou atualiza a mensagem usando o índice UNIQUE (wid, companyId)
 * adicionado pela migration 20260520120000.
 *
 * Importante: o Message.upsert do Sequelize agora consegue resolver o conflito
 * pelo par (wid, companyId), evitando que duas execuções concorrentes do
 * messages.upsert do Baileys insiram a mesma mensagem duas vezes.
 *
 * Como fallback adicional (defesa em profundidade), se a UNIQUE constraint
 * dispare em runtime ainda assim, tratamos como mensagem já existente.
 */
const CreateMessageService = async ({
  messageData,
  companyId
}: Request): Promise<Message> => {
  try {
    // O upsert do Sequelize agora resolve via ON CONFLICT (wid, companyId)
    // graças ao índice UNIQUE criado pela migration 20260520120000. Em runtime,
    // se ainda assim duas execuções concorrentes baterem no mesmo wid, a UNIQUE
    // garante que apenas uma linha exista — capturamos o erro e seguimos.
    await Message.upsert({ ...messageData, companyId });
  } catch (err: any) {
    if (err?.name !== "SequelizeUniqueConstraintError") {
      throw err;
    }
    logger.debug(
      `CreateMessageService: race em (wid=${messageData.wid}, companyId=${companyId}) — usando linha existente.`
    );
  }

  const message = await Message.findOne({
    where: {
      wid: messageData.wid,
      companyId
    },
    include: [
      "contact",
      {
        model: Ticket,
        as: "ticket",
        include: [
          {
            model: Contact,
            attributes: ["id", "name", "number", "email", "profilePicUrl", "acceptAudioMessage", "active", "urlPicture", "companyId"],
            include: ["extraInfo", "tags"]
          },
          {
            model: Queue,
            attributes: ["id", "name", "color"]
          },
          {
            model: Whatsapp,
            attributes: ["id", "name", "groupAsTicket"]
          },
          {
            model: User,
            attributes: ["id", "name"]
          },
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "color"]
          }
        ]
      },
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new Error("ERR_CREATING_MESSAGE");
  }

  if (message.ticket.queueId !== null && message.queueId === null) {
    await message.update({ queueId: message.ticket.queueId });
  }

  if (message.isPrivate) {
    await message.update({ wid: `PVT${message.id}` });
  }

  const io = getIO();

  if (!messageData?.ticketImported) {
    io.of(String(companyId))
      .emit(`company-${companyId}-appMessage`, {
        action: "create",
        message,
        ticket: message.ticket,
        contact: message.ticket.contact
      });
  }


  return message;
};

export default CreateMessageService;
