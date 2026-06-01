import { Request, Response } from "express";
import crypto from "crypto";
import Whatsapp from "../models/Whatsapp";

const base64UrlDecode = (input: string): Buffer => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
};

const parseSignedRequest = (signedRequest: string) => {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) throw new Error("FACEBOOK_APP_SECRET not configured");

  const [encodedSignature, payload] = signedRequest.split(".", 2);
  if (!encodedSignature || !payload) throw new Error("Invalid signed_request");

  const signature = base64UrlDecode(encodedSignature);
  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest();

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(signature, expectedSignature)
  ) {
    throw new Error("Invalid signed_request signature");
  }

  const data = JSON.parse(base64UrlDecode(payload).toString("utf8"));
  if (data.algorithm && String(data.algorithm).toUpperCase() !== "HMAC-SHA256") {
    throw new Error("Unsupported signed_request algorithm");
  }

  return data;
};

const makeConfirmationCode = (userId: string): string =>
  crypto
    .createHash("sha256")
    .update(`${userId}:${Date.now()}:${process.env.JWT_SECRET || ""}`)
    .digest("hex")
    .slice(0, 20);

export const dataDeletion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const signedRequest = req.body?.signed_request || req.query?.signed_request;
    if (!signedRequest || typeof signedRequest !== "string") {
      return res.status(400).json({ error: "signed_request is required" });
    }

    const data = parseSignedRequest(signedRequest);
    const facebookUserId = String(data.user_id || "");
    if (!facebookUserId) {
      return res.status(400).json({ error: "user_id not found in signed_request" });
    }

    const confirmationCode = makeConfirmationCode(facebookUserId);

    await Whatsapp.update(
      {
        status: "DISCONNECTED",
        session: null,
        qrcode: null,
        facebookUserToken: null,
        tokenMeta: null
      },
      {
        where: {
          facebookUserId
        }
      }
    );

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;
    const statusUrl = `${baseUrl}/meta/data-deletion/status?code=${confirmationCode}`;

    return res.status(200).json({
      url: statusUrl,
      confirmation_code: confirmationCode
    });
  } catch (error) {
    return res.status(400).json({
      error: "Invalid data deletion request"
    });
  }
};

export const dataDeletionStatus = async (req: Request, res: Response): Promise<Response> => {
  const code = String(req.query.code || "");

  return res.status(200).send(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Status de Exclusao de Dados</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.5; color: #1f2937; }
          main { max-width: 760px; }
          h1 { font-size: 28px; margin-bottom: 16px; }
          code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <main>
          <h1>Status de Exclusao de Dados</h1>
          <p>Recebemos a solicitacao de exclusao/desvinculacao de dados associados ao login Meta.</p>
          <p>Codigo de confirmacao: <code>${code || "nao informado"}</code></p>
          <p>As conexoes Facebook/Instagram associadas ao usuario foram desconectadas e os tokens de acesso removidos do sistema.</p>
        </main>
      </body>
    </html>
  `);
};
