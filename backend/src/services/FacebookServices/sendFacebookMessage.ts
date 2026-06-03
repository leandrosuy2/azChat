import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { sendText } from "./graphAPI";
import formatBody from "../../helpers/Mustache";
import {
  isInstagramDirectProvider,
  sendInstagramText
} from "../InstagramServices/instagramAPI";
import CreateMetaEventLogService from "../MetaServices/CreateMetaEventLogService";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const sendFacebookMessage = async ({ body, ticket, quotedMsg }: Request): Promise<any> => {
  const { number } = ticket.contact;
  try {
    if (
      ticket.channel === "instagram" &&
      isInstagramDirectProvider(
        ticket.whatsapp?.provider,
        ticket.whatsapp?.facebookUserToken
      )
    ) {
      const send: any = await sendInstagramText(
        ticket.whatsapp.facebookPageUserId,
        number,
        formatBody(body, ticket),
        ticket.whatsapp.facebookUserToken
      );

      await ticket.update({ lastMessage: body });
      await CreateMetaEventLogService({
        companyId: ticket.companyId,
        whatsappId: ticket.whatsappId,
        channel: ticket.channel,
        direction: "outbound",
        eventType: "message",
        externalId: send?.message_id || send?.recipient_id || null,
        status: "sent",
        payload: { response: send, body: formatBody(body, ticket) }
      });

      return send;
    }

    const send: any = await sendText(
      number,
      formatBody(body, ticket),
      ticket.whatsapp.facebookUserToken
    );

    await ticket.update({ lastMessage: body });
    await CreateMetaEventLogService({
      companyId: ticket.companyId,
      whatsappId: ticket.whatsappId,
      channel: ticket.channel,
      direction: "outbound",
      eventType: "message",
      externalId: send?.message_id || send?.recipient_id || null,
      status: "sent",
      payload: { response: send, body: formatBody(body, ticket) }
    });

    return send;

  } catch (err) {
    const fbError = err?.response?.data?.error;
    console.error("[sendFacebookMessage]", {
      ticketId: ticket.id,
      channel: ticket.channel,
      recipient: number,
      fbError
    });
    const detail = fbError?.message || err?.message || "unknown";
    await CreateMetaEventLogService({
      companyId: ticket.companyId,
      whatsappId: ticket.whatsappId,
      channel: ticket.channel,
      direction: "outbound",
      eventType: "message",
      status: "error",
      errorMessage: detail,
      payload: { body }
    });
    throw new AppError(`ERR_SENDING_FACEBOOK_MSG: ${detail}`);
  }
};

export default sendFacebookMessage;
