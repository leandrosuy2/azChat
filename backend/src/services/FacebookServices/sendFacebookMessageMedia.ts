import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import { sendAttachmentFromUrl } from "./graphAPI";
import {
  isInstagramDirectProvider,
  sendInstagramAttachmentFromUrl
} from "../InstagramServices/instagramAPI";
import CreateMetaEventLogService from "../MetaServices/CreateMetaEventLogService";
// import { verifyMessage } from "./facebookMessageListener";

interface Request {
  ticket: Ticket;
  media?: Express.Multer.File;
  body?: string;
  url?: string;
}

export const typeAttachment = (media: Express.Multer.File) => {
  if (media.mimetype.includes("image")) {
    return "image";
  }
  if (media.mimetype.includes("video")) {
    return "video";
  }
  if (media.mimetype.includes("audio")) {
    return "audio";
  }

  return "file";
};

export const sendFacebookMessageMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<any> => {
  try {
    const type = typeAttachment(media);

    const domain = `${process.env.BACKEND_URL}/public/company${ticket.companyId}/${media.filename}`

    if (
      ticket.channel === "instagram" &&
      isInstagramDirectProvider(
        ticket.whatsapp?.provider,
        ticket.whatsapp?.facebookUserToken
      )
    ) {
      const sendMessage: any = await sendInstagramAttachmentFromUrl(
        ticket.whatsapp.facebookPageUserId,
        ticket.contact.number,
        domain,
        type,
        ticket.whatsapp.facebookUserToken
      );

      await ticket.update({ lastMessage: media.filename });
      await CreateMetaEventLogService({
        companyId: ticket.companyId,
        whatsappId: ticket.whatsappId,
        channel: ticket.channel,
        direction: "outbound",
        eventType: "media",
        externalId: sendMessage?.message_id || sendMessage?.recipient_id || null,
        status: "sent",
        payload: { response: sendMessage, media: media.filename, type }
      });

      return sendMessage;
    }

    const sendMessage: any = await sendAttachmentFromUrl(
      ticket.contact.number,
      domain,
      type,
      ticket.whatsapp.facebookUserToken
    );

    await ticket.update({ lastMessage: media.filename });
    await CreateMetaEventLogService({
      companyId: ticket.companyId,
      whatsappId: ticket.whatsappId,
      channel: ticket.channel,
      direction: "outbound",
      eventType: "media",
      externalId: sendMessage?.message_id || sendMessage?.recipient_id || null,
      status: "sent",
      payload: { response: sendMessage, media: media.filename, type }
    });

    return sendMessage;
  } catch (err) {
    await CreateMetaEventLogService({
      companyId: ticket.companyId,
      whatsappId: ticket.whatsappId,
      channel: ticket.channel,
      direction: "outbound",
      eventType: "media",
      status: "error",
      errorMessage: err?.message || "ERR_SENDING_FACEBOOK_MSG",
      payload: { media: media?.filename }
    });
    throw new AppError("ERR_SENDING_FACEBOOK_MSG");
  }
};

export const sendFacebookMessageMediaExternal = async ({
  url,
  ticket,
  body
}: Request): Promise<any> => {
  try {
    const type = "image"

    // const domain = `${process.env.BACKEND_URL}/public/${media.filename}`

    if (
      ticket.channel === "instagram" &&
      isInstagramDirectProvider(
        ticket.whatsapp?.provider,
        ticket.whatsapp?.facebookUserToken
      )
    ) {
      const sendMessage = await sendInstagramAttachmentFromUrl(
        ticket.whatsapp.facebookPageUserId,
        ticket.contact.number,
        url,
        type,
        ticket.whatsapp.facebookUserToken
      );

      const randomName = Math.random().toString(36).substring(7);

      await ticket.update({ lastMessage: body ||  `${randomName}.jpg}`});

      return sendMessage;
    }

    const sendMessage = await sendAttachmentFromUrl(
      ticket.contact.number,
      url,
      type,
      ticket.whatsapp.facebookUserToken
    );

    const randomName = Math.random().toString(36).substring(7);

    await ticket.update({ lastMessage: body ||  `${randomName}.jpg}`});

    // fs.unlinkSync(media.path);

    return sendMessage;
  } catch (err) {
    throw new AppError("ERR_SENDING_FACEBOOK_MSG");
  }
};

export const sendFacebookMessageFileExternal = async ({
  url,
  ticket,
  body
}: Request): Promise<any> => {
  try {
    const type = "file"

    // const domain = `${process.env.BACKEND_URL}/public/${media.filename}`

    if (
      ticket.channel === "instagram" &&
      isInstagramDirectProvider(
        ticket.whatsapp?.provider,
        ticket.whatsapp?.facebookUserToken
      )
    ) {
      const sendMessage = await sendInstagramAttachmentFromUrl(
        ticket.whatsapp.facebookPageUserId,
        ticket.contact.number,
        url,
        type,
        ticket.whatsapp.facebookUserToken
      );

      const randomName = Math.random().toString(36).substring(7);

      await ticket.update({ lastMessage: body ||  `${randomName}.pdf}`});

      return sendMessage;
    }

    const sendMessage = await sendAttachmentFromUrl(
      ticket.contact.number,
      url,
      type,
      ticket.whatsapp.facebookUserToken
    );

    const randomName = Math.random().toString(36).substring(7);

    await ticket.update({ lastMessage: body ||  `${randomName}.pdf}`});

    // fs.unlinkSync(media.path);

    return sendMessage;
  } catch (err) {
    throw new AppError("ERR_SENDING_FACEBOOK_MSG");
  }
};
