import axios from "axios";
import FormData from "form-data";
import { createReadStream } from "fs";
import logger from "../../utils/logger";

const graphApiVersion = process.env.META_GRAPH_API_VERSION || "v25.0";
const graphApiBaseUrl = `https://graph.facebook.com/${graphApiVersion}/`;

const apiBase = (token: string) =>
  axios.create({
    baseURL: graphApiBaseUrl,
    params: {
      access_token: token
    }
  });

export const getAccessToken = async (): Promise<string> => {
  const { data } = await axios.get(
    `${graphApiBaseUrl}oauth/access_token`,
    {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        grant_type: "client_credentials"
      }
    }
  );

  return data.access_token;
};

export const markSeen = async (id: string, token: string): Promise<void> => {
  await apiBase(token).post(`${id}/messages`, {
    recipient: {
      id
    },
    sender_action: "mark_seen"
  });
};

export const showTypingIndicator = async (
  id: string, 
  token: string,
  action: string
): Promise<void> => {

  try {
    const { data } = await apiBase(token).post("me/messages", {
      recipient: {
        id: id
      },
      sender_action: action
    })

    return data;
  } catch (error) {
    console.log(error);
  }

}


export const sendText = async (
  id: string | number,
  text: string,
  token: string,
): Promise<void> => {
  try {
    const { data } = await apiBase(token).post("me/messages", {
      recipient: {
        id
      },
      message: {
        text: `${text}`,
      }
    });
    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const sendAttachmentFromUrl = async (
  id: string,
  url: string,
  type: string,
  token: string
): Promise<void> => {
  try {
    const { data } = await apiBase(token).post("me/messages", {
      recipient: {
        id
      },
      message: {
        attachment: {
          type,
          payload: {
            url
          }
        }
      }
    });

    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const sendAttachment = async (
  id: string,
  file: Express.Multer.File,
  type: string,
  token: string
): Promise<void> => {
  const formData: FormData = new FormData();

  formData.append(
    "recipient",
    JSON.stringify({
      id
    })
  );

  formData.append(
    "message",
    JSON.stringify({
      attachment: {
        type,
        payload: {
          is_reusable: true
        }
      }
    })
  );

  const fileReaderStream = createReadStream(file.path);

  formData.append("filedata", fileReaderStream);

  try {
    await apiBase(token).post("me/messages", formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
  } catch (error) {
    throw new Error(error);
  }
};

export const genText = (text: string): any => {
  const response = {
    text
  };

  return response;
};

/**
 * Valida um token de página/usuário do Facebook chamando /me.
 * Diferente de getProfile, NÃO mascara o erro: relança o erro original
 * do axios para que o chamador inspecione status HTTP e código da Meta.
 */
export const validateFacebookToken = async (token: string): Promise<any> => {
  const { data } = await apiBase(token).get("me", {
    params: { fields: "id,name" }
  });
  return data;
};

export const getProfile = async (id: string, token: string): Promise<any> => {
  try {
    const { data } = await apiBase(token).get(id);

    return data;
  } catch (error) {
    console.log(error);
    throw new Error("ERR_FETCHING_FB_USER_PROFILE_2");
  }
};

export const getPageProfile = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await apiBase(token).get(
      `${id}/accounts?fields=name,access_token,instagram_business_account{id,username,profile_picture_url,name}`
    );
    return data;
  } catch (error) {
    console.log(error);
    throw new Error("ERR_FETCHING_FB_PAGES");
  }
};

export const getPageInstagramBusinessAccount = async (
  pageId: string,
  token: string
): Promise<any> => {
  const { data } = await apiBase(token).get(
    `${pageId}?fields=instagram_business_account{id,username,name}`
  );

  return data.instagram_business_account;
};

export const getInstagramConversations = async (
  pageId: string,
  token: string,
  limit = 25
): Promise<any> => {
  const { data } = await apiBase(token).get(`${pageId}/conversations`, {
    params: {
      platform: "instagram",
      fields: "id,updated_time,participants",
      limit
    }
  });

  return data;
};

export const getConversationMessages = async (
  conversationId: string,
  token: string,
  limit = 25
): Promise<any> => {
  const { data } = await apiBase(token).get(`${conversationId}/messages`, {
    params: {
      fields: "id,message,from,to,created_time,attachments",
      limit
    }
  });

  return data;
};

export const profilePsid = async (id: string, token: string): Promise<any> => {
  try {
    const { data } = await axios.get(
      `${graphApiBaseUrl}${id}?access_token=${token}`
    );
    return data;
  } catch (error) {
    console.log(error);
    return getProfile(id, token);
  }
};

export const subscribeApp = async (id: string, token: string): Promise<any> => {
  try {
    const { data } = await axios.post(
      `${graphApiBaseUrl}${id}/subscribed_apps?access_token=${token}`,
      {
        subscribed_fields: [
          "messages",
          "messaging_postbacks",
          "message_deliveries",
          "message_reads",
          "message_echoes"
        ]
      }
    );
    return data;
  } catch (error) {
    console.log(error)
    throw new Error("ERR_SUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS");
  }
};

export const unsubscribeApp = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await axios.delete(
      `${graphApiBaseUrl}${id}/subscribed_apps?access_token=${token}`
    );
    return data;
  } catch (error) {
    throw new Error("ERR_UNSUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS");
  }
};


export const getSubscribedApps = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await apiBase(token).get(`${id}/subscribed_apps`);
    return data;
  } catch (error) {
    throw new Error("ERR_GETTING_SUBSCRIBED_APPS");
  }
};

export const getAccessTokenFromPage = async (
  token: string
): Promise<string> => {
  try {

    if (!token) throw new Error("ERR_FETCHING_FB_USER_TOKEN");
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      logger.warn("FACEBOOK_APP_ID/FACEBOOK_APP_SECRET missing; using page token without exchange");
      return token;
    }

    const data = await axios.get(
      `${graphApiBaseUrl}oauth/access_token`,
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          grant_type: "fb_exchange_token",
          fb_exchange_token: token
        }
      }
    );

    return data.data.access_token;
  } catch (error) {
    console.log(error);
    throw new Error("ERR_FETCHING_FB_USER_TOKEN");
  }
};

/**
 * Trocar o user access token de curta duração por um de longa duração (~60 dias).
 * Depois desse passo, /me/accounts retorna page tokens que NÃO expiram (até o usuário revogar).
 */
export const exchangeForLongLivedUserToken = async (
  shortLivedUserToken: string
): Promise<string> => {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    logger.warn(
      "FACEBOOK_APP_ID/FACEBOOK_APP_SECRET ausentes — sem extensão de token, conexão vai expirar em ~1h"
    );
    return shortLivedUserToken;
  }

  const { data } = await axios.get(`${graphApiBaseUrl}oauth/access_token`, {
    params: {
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      grant_type: "fb_exchange_token",
      fb_exchange_token: shortLivedUserToken
    }
  });

  return data.access_token;
};

export const removeApplcation = async (
  id: string,
  token: string
): Promise<void> => {
  try {
    await axios.delete(`${graphApiBaseUrl}${id}/permissions`, {
      params: {
        access_token: token
      }
    });
  } catch (error) {
    logger.error("ERR_REMOVING_APP_FROM_PAGE");
  }
};
