import axios from "axios";
import logger from "../../utils/logger";

// A API do Instagram com Login do Instagram (graph.instagram.com) NÃO usa
// prefixo de versão no path. Chamar /v25.0/me, /{id}/subscribed_apps etc.
// retorna "Unsupported request - method type: get" (IGApiException code 100).
// Os endpoints são versionados implicitamente pelo host.
const instagramGraphBaseUrl = "https://graph.instagram.com/";

export interface InstagramRefreshResult {
  accessToken: string;
  expiresInSeconds: number;
}

const getInstagramAppCredentials = () => {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET missing");
  }

  return { appId, appSecret };
};

const apiBase = (token: string) =>
  axios.create({
    baseURL: instagramGraphBaseUrl,
    params: {
      access_token: token
    }
  });

export const isInstagramDirectProvider = (
  provider?: string,
  token?: string
): boolean =>
  provider === "instagram" ||
  provider === "instagram_direct" ||
  Boolean(token?.startsWith("IG"));

export const exchangeInstagramCodeForToken = async (
  code: string,
  redirectUri: string
): Promise<any> => {
  const { appId, appSecret } = getInstagramAppCredentials();
  const form = new URLSearchParams();

  form.set("client_id", appId);
  form.set("client_secret", appSecret);
  form.set("grant_type", "authorization_code");
  form.set("redirect_uri", redirectUri);
  form.set("code", code);

  const { data } = await axios.post(
    "https://api.instagram.com/oauth/access_token",
    form.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );

  return data;
};

export const exchangeForLongLivedInstagramToken = async (
  shortLivedToken: string
): Promise<InstagramRefreshResult> => {
  const { appSecret } = getInstagramAppCredentials();

  try {
    const { data } = await axios.get(
      "https://graph.instagram.com/access_token",
      {
        params: {
          grant_type: "ig_exchange_token",
          client_secret: appSecret,
          access_token: shortLivedToken
        }
      }
    );

    return {
      accessToken: data.access_token,
      expiresInSeconds: Number(data.expires_in) || 0
    };
  } catch (error) {
    // ig_exchange_token só funciona uma vez, com token short-lived.
    // Ao reconectar uma conta com sessão ativa, o code OAuth já devolve
    // um token long-lived e o exchange falha (code 100 "Unsupported
    // request" ou 452 "Session key invalid"). Nesse caso o token já É
    // long-lived: usamos ig_refresh_token para obter a validade real.
    logger.info(
      "[Instagram Direct] ig_exchange_token falhou; token provavelmente já é long-lived, tentando refresh"
    );
    return refreshInstagramLongLivedToken(shortLivedToken);
  }
};

/**
 * Estende um token long-lived do Instagram por mais ~60 dias.
 * A Graph API só aceita ig_refresh_token quando o token tem pelo menos 24h
 * de vida; tokens recém-trocados não podem ser renovados imediatamente.
 */
export const refreshInstagramLongLivedToken = async (
  longLivedToken: string
): Promise<InstagramRefreshResult> => {
  const { data } = await axios.get("https://graph.instagram.com/refresh_access_token", {
    params: {
      grant_type: "ig_refresh_token",
      access_token: longLivedToken
    }
  });

  return {
    accessToken: data.access_token,
    expiresInSeconds: Number(data.expires_in) || 0
  };
};

export const getInstagramMe = async (token: string): Promise<any> => {
  try {
    const { data } = await apiBase(token).get("me", {
      params: {
        fields: "user_id,username,account_type,profile_picture_url,name"
      }
    });

    return data;
  } catch (error) {
    logger.warn("[Instagram Direct] failed to fetch full profile, retrying minimal profile");
    const { data } = await apiBase(token).get("me", {
      params: {
        fields: "user_id,username"
      }
    });

    return data;
  }
};

export const subscribeInstagramDirectApp = async (
  igUserId: string,
  token: string
): Promise<any> => {
  // Para Instagram Login a inscrição correta é em `me/subscribed_apps`
  // (a Meta resolve a conta pela sessão do token). Usar o ID na URL
  // — sobretudo o app-scoped — retorna IGApiException code 100
  // "Unsupported request - method type: post".
  const { data } = await apiBase(token).post("me/subscribed_apps", null, {
    params: {
      subscribed_fields: "messages,messaging_postbacks"
    }
  });

  return data;
};

export const getInstagramProfile = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await apiBase(token).get(id, {
      params: {
        fields: "id,username,name,profile_picture_url"
      }
    });

    return data;
  } catch (error) {
    return { id };
  }
};

export const sendInstagramText = async (
  igUserId: string,
  recipientId: string | number,
  text: string,
  token: string
): Promise<any> => {
  const { data } = await apiBase(token).post(`${igUserId}/messages`, {
    recipient: {
      id: recipientId
    },
    message: {
      text
    }
  });

  return data;
};

export const sendInstagramAttachmentFromUrl = async (
  igUserId: string,
  recipientId: string | number,
  url: string,
  type: string,
  token: string
): Promise<any> => {
  const { data } = await apiBase(token).post(`${igUserId}/messages`, {
    recipient: {
      id: recipientId
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
};

export const getInstagramDirectConversations = async (
  igUserId: string,
  token: string,
  limit = 25
): Promise<any> => {
  const { data } = await apiBase(token).get(`${igUserId}/conversations`, {
    params: {
      platform: "instagram",
      fields: "id,updated_time,participants",
      limit
    }
  });

  return data;
};

export const getInstagramDirectConversationMessages = async (
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
