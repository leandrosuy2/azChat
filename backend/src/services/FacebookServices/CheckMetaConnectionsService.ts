import { Op } from "sequelize";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import { getIO } from "../../libs/socket";
import {
  getInstagramMe,
  refreshInstagramLongLivedToken
} from "../InstagramServices/instagramAPI";
import { validateFacebookToken } from "./graphAPI";

/**
 * Renova o token long-lived do Instagram quando faltam menos de REFRESH_THRESHOLD
 * dias para expirar. A Graph API estende por mais ~60 dias a cada chamada.
 */
const REFRESH_THRESHOLD_DAYS = 10;

const emitUpdate = (whatsapp: Whatsapp) => {
  const io = getIO();
  io.of(String(whatsapp.companyId)).emit(
    `company-${whatsapp.companyId}-whatsapp`,
    {
      action: "update",
      whatsapp
    }
  );
};

const isInstagramDirect = (whatsapp: Whatsapp): boolean =>
  whatsapp.channel === "instagram" &&
  (whatsapp.provider === "instagram_direct" ||
    Boolean(whatsapp.facebookUserToken?.startsWith("IG")));

const markDisconnected = async (whatsapp: Whatsapp, reason: string) => {
  if (whatsapp.status === "DISCONNECTED" && whatsapp.metaConnectionError === reason) {
    return;
  }
  await whatsapp.update({
    status: "DISCONNECTED",
    metaConnectionError: reason
  });
  logger.warn(
    `[CheckMetaConnections] ${whatsapp.channel} id=${whatsapp.id} desconectado: ${reason}`
  );
  emitUpdate(whatsapp);
};

const markHealthy = async (whatsapp: Whatsapp) => {
  if (whatsapp.status === "CONNECTED" && !whatsapp.metaConnectionError) {
    return;
  }
  await whatsapp.update({
    status: "CONNECTED",
    metaConnectionError: null
  });
  emitUpdate(whatsapp);
};

const describeMetaError = (error: any): string => {
  const metaError = error?.response?.data?.error;
  if (metaError) {
    return `${metaError.type || "OAuthException"}: ${
      metaError.message || "token inválido"
    }`;
  }
  return error?.message || "Falha ao validar conexão com a Meta";
};

const refreshInstagramTokenIfNeeded = async (whatsapp: Whatsapp) => {
  const expiresAt = whatsapp.tokenMetaExpiresAt
    ? new Date(whatsapp.tokenMetaExpiresAt).getTime()
    : null;

  if (!expiresAt) return;

  const msUntilExpiry = expiresAt - Date.now();
  const thresholdMs = REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

  if (msUntilExpiry > thresholdMs) return;

  try {
    const refreshed = await refreshInstagramLongLivedToken(
      whatsapp.facebookUserToken
    );
    const newExpiresAt =
      refreshed.expiresInSeconds > 0
        ? new Date(Date.now() + refreshed.expiresInSeconds * 1000)
        : null;

    await whatsapp.update({
      facebookUserToken: refreshed.accessToken,
      tokenMetaExpiresAt: newExpiresAt
    });
    logger.info(
      `[CheckMetaConnections] token Instagram id=${whatsapp.id} renovado, expira em ${newExpiresAt?.toISOString()}`
    );
  } catch (error) {
    logger.error(
      `[CheckMetaConnections] falha ao renovar token Instagram id=${whatsapp.id}: ${describeMetaError(
        error
      )}`
    );
  }
};

const checkConnection = async (whatsapp: Whatsapp) => {
  try {
    if (isInstagramDirect(whatsapp)) {
      await getInstagramMe(whatsapp.facebookUserToken);
      await markHealthy(whatsapp);
      await refreshInstagramTokenIfNeeded(whatsapp);
      return;
    }

    await validateFacebookToken(whatsapp.facebookUserToken);
    await markHealthy(whatsapp);
  } catch (error) {
    const status = error?.response?.status;
    const code = error?.response?.data?.error?.code;
    const isAuthError =
      status === 401 ||
      status === 400 ||
      code === 190 ||
      code === 102 ||
      code === 10;

    if (isAuthError) {
      await markDisconnected(whatsapp, describeMetaError(error));
    } else {
      logger.warn(
        `[CheckMetaConnections] erro transitório ${whatsapp.channel} id=${whatsapp.id}: ${describeMetaError(
          error
        )}`
      );
    }
  }
};

const CheckMetaConnectionsService = async (): Promise<void> => {
  const connections = await Whatsapp.findAll({
    where: {
      channel: { [Op.in]: ["instagram", "facebook"] }
    }
  });

  for (const whatsapp of connections) {
    if (!whatsapp.facebookUserToken) {
      // eslint-disable-next-line no-continue
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await checkConnection(whatsapp);
  }
};

export default CheckMetaConnectionsService;
