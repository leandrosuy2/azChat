import axios from "axios";
import fs from "fs";
import { writeFileSync } from "fs";
import { join } from "path";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import CompaniesSettings from "../../models/CompaniesSettings";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import {
  getConversationMessages,
  getInstagramConversations,
  getPageInstagramBusinessAccount
} from "./graphAPI";
import {
  getInstagramDirectConversationMessages,
  getInstagramDirectConversations,
  isInstagramDirectProvider,
  subscribeInstagramDirectApp
} from "../InstagramServices/instagramAPI";

interface Request {
  instagramWhatsapp: Whatsapp;
  conversationsLimit?: number;
  messagesLimit?: number;
}

interface Response {
  conversations: number;
  messages: number;
}

const getAttachmentUrl = (attachment: any): string | null =>
  attachment?.payload?.url ||
  attachment?.image_data?.url ||
  attachment?.video_data?.url ||
  attachment?.file_url ||
  attachment?.url ||
  null;

const getAttachmentType = (attachment: any): string =>
  attachment?.type ||
  (attachment?.image_data ? "image" : null) ||
  (attachment?.video_data ? "video" : null) ||
  "file";

const saveAttachment = async (
  attachment: any,
  companyId: number
): Promise<{ fileName: string; mediaType: string } | null> => {
  const url = getAttachmentUrl(attachment);
  if (!url) return null;

  const { data } = await axios.get(url, {
    responseType: "arraybuffer"
  });

  // eslint-disable-next-line no-eval
  const { fileTypeFromBuffer } = await (eval('import("file-type")') as Promise<typeof import("file-type")>);
  const type = await fileTypeFromBuffer(data);
  const extension = type?.ext || "bin";
  const fileName = `${new Date().getTime()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;
  const folder = `public/company${companyId}`;

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    fs.chmodSync(folder, 0o777);
  }

  writeFileSync(join(__dirname, "..", "..", "..", folder, fileName), data);

  return {
    fileName,
    mediaType: getAttachmentType(attachment)
  };
};

const findFacebookPageConnection = async (
  instagramWhatsapp: Whatsapp
): Promise<Whatsapp | null> => {
  const facebookConnections = await Whatsapp.findAll({
    where: {
      companyId: instagramWhatsapp.companyId,
      channel: "facebook"
    }
  });

  for (const facebookWhatsapp of facebookConnections) {
    try {
      const instagramAccount = await getPageInstagramBusinessAccount(
        facebookWhatsapp.facebookPageUserId,
        facebookWhatsapp.facebookUserToken
      );

      if (instagramAccount?.id === instagramWhatsapp.facebookPageUserId) {
        return facebookWhatsapp;
      }
    } catch (error) {
      // Try the next page connection. The caller receives null if none match.
    }
  }

  return null;
};

const getConversationContact = (
  participants: any,
  instagramId: string
): any => {
  const participantList = participants?.data || [];
  return participantList.find((participant: any) => participant.id !== instagramId);
};

const SyncInstagramDmsService = async ({
  instagramWhatsapp,
  conversationsLimit = 25,
  messagesLimit = 25
}: Request): Promise<Response> => {
  if (instagramWhatsapp.channel !== "instagram") {
    throw new Error("ERR_SYNC_INSTAGRAM_DMS_CHANNEL");
  }

  const isDirectInstagram = isInstagramDirectProvider(
    instagramWhatsapp.provider,
    instagramWhatsapp.facebookUserToken
  );
  const facebookWhatsapp = isDirectInstagram
    ? instagramWhatsapp
    : await findFacebookPageConnection(instagramWhatsapp);
  if (!facebookWhatsapp) {
    throw new Error("ERR_SYNC_INSTAGRAM_DMS_FACEBOOK_PAGE_NOT_FOUND");
  }

  const companyId = instagramWhatsapp.companyId;
  const settings = await CompaniesSettings.findOne({ where: { companyId } });

  if (isDirectInstagram) {
    try {
      await subscribeInstagramDirectApp(
        instagramWhatsapp.facebookPageUserId,
        instagramWhatsapp.facebookUserToken
      );
    } catch (error) {
      console.warn("[SyncInstagramDms] Instagram direct subscription repair failed", {
        instagramId: instagramWhatsapp.facebookPageUserId,
        error: error?.response?.data?.error || error?.message
      });
    }
  }

  let conversations: any;
  try {
    conversations = isDirectInstagram
      ? await getInstagramDirectConversations(
          instagramWhatsapp.facebookPageUserId,
          instagramWhatsapp.facebookUserToken,
          conversationsLimit
        )
      : await getInstagramConversations(
          facebookWhatsapp.facebookPageUserId,
          facebookWhatsapp.facebookUserToken,
          conversationsLimit
        );
  } catch (err: any) {
    const fbError = err?.response?.data?.error;
    console.error("[SyncInstagramDms] Graph API error", {
      pageId: facebookWhatsapp.facebookPageUserId,
      status: err?.response?.status,
      fbError
    });
    const detail = fbError?.message || err?.message || "unknown";
    const subcode = fbError?.error_subcode;
    const code = fbError?.code;
    throw new Error(
      `ERR_SYNC_INSTAGRAM_DMS_GRAPH (code=${code} subcode=${subcode}): ${detail}`
    );
  }

  let importedMessages = 0;

  for (const conversation of conversations.data || []) {
    const conversationContact = getConversationContact(
      conversation.participants,
      instagramWhatsapp.facebookPageUserId
    );

    if (!conversationContact?.id) continue;

    const contact = await CreateOrUpdateContactService({
      name: conversationContact.username || conversationContact.name || conversationContact.id,
      number: conversationContact.id,
      profilePicUrl: conversationContact.profile_picture_url || "",
      isGroup: false,
      companyId,
      channel: "instagram",
      whatsappId: instagramWhatsapp.id
    });

    let ticket = await Ticket.findOne({
      where: {
        contactId: contact.id,
        companyId,
        whatsappId: instagramWhatsapp.id,
        channel: "instagram",
        status: "closed"
      },
      order: [["id", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        imported: null,
        unreadMessages: 0
      });
    } else {
      ticket = await FindOrCreateTicketService(
        contact,
        instagramWhatsapp,
        0,
        companyId,
        0,
        0,
        null,
        "instagram",
        false,
        false,
        settings
      );
    }

    const messages = isDirectInstagram
      ? await getInstagramDirectConversationMessages(
          conversation.id,
          instagramWhatsapp.facebookUserToken,
          messagesLimit
        )
      : await getConversationMessages(
          conversation.id,
          facebookWhatsapp.facebookUserToken,
          messagesLimit
        );

    const orderedMessages = [...(messages.data || [])].reverse();
    let lastMessage = ticket.lastMessage || "";

    for (const message of orderedMessages) {
      const fromMe = message.from?.id === instagramWhatsapp.facebookPageUserId;
      const attachments = message.attachments?.data || [];

      if (attachments.length > 0) {
        for (const [index, attachment] of attachments.entries()) {
          const wid = `${message.id}:attachment:${index}`;
          const exists = await Message.findOne({ where: { wid, companyId } });
          if (exists) continue;
          const savedAttachment = await saveAttachment(attachment, companyId);
          if (!savedAttachment) continue;

          await CreateMessageService({
            messageData: {
              wid,
              ticketId: ticket.id,
              contactId: fromMe ? undefined : contact.id,
              body: message.message || savedAttachment.fileName,
              fromMe,
              read: fromMe,
              mediaType: savedAttachment.mediaType,
              mediaUrl: savedAttachment.fileName,
              ack: 3,
              channel: "instagram",
              ticketImported: true,
              dataJson: JSON.stringify(message)
            } as any,
            companyId
          });
          lastMessage = message.message || savedAttachment.fileName;
          importedMessages += 1;
        }
      } else {
        const exists = await Message.findOne({
          where: {
            wid: message.id,
            companyId
          }
        });
        if (exists) continue;

        await CreateMessageService({
          messageData: {
            wid: message.id,
            ticketId: ticket.id,
            contactId: fromMe ? undefined : contact.id,
            body: message.message || "",
            fromMe,
            read: fromMe,
            ack: 3,
            channel: "instagram",
            ticketImported: true,
            dataJson: JSON.stringify(message)
          } as any,
          companyId
        });
        lastMessage = message.message || "";
        importedMessages += 1;
      }
    }

    await ticket.update({
      imported: null,
      lastMessage,
      status: ticket.status === "closed" ? "pending" : ticket.status
    });
  }

  return {
    conversations: conversations.data?.length || 0,
    messages: importedMessages
  };
};

export default SyncInstagramDmsService;
