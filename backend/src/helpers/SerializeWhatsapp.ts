import Whatsapp from "../models/Whatsapp";

const maskSecret = (value?: string | null): string | null => {
  if (!value) return null;
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const getBackendUrl = (): string =>
  `${process.env.BACKEND_URL || ""}${process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""}`;

export const serializeWhatsapp = (whatsapp: Whatsapp): any => {
  const plain = typeof (whatsapp as any).toJSON === "function"
    ? (whatsapp as any).toJSON()
    : whatsapp;

  const webhookUrl =
    ["facebook", "instagram"].includes(plain.channel) && plain.companyId && plain.id
      ? `${getBackendUrl()}/webhooks/meta/${plain.companyId}/${plain.id}`
      : null;

  return {
    ...plain,
    facebookUserToken: maskSecret(plain.facebookUserToken),
    tokenMeta: maskSecret(plain.tokenMeta),
    metaAppSecret: maskSecret(plain.metaAppSecret),
    metaVerifyToken: plain.metaVerifyToken || null,
    webhookUrl
  };
};

export const serializeWhatsapps = (whatsapps: Whatsapp[]): any[] =>
  whatsapps.map(serializeWhatsapp);

export default serializeWhatsapp;
