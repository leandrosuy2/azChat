import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";

/**
 * Middleware de autenticação por token de ambiente.
 * Usado em rotas públicas (sem JWT) como /public-settings.
 *
 * O token é enviado pelo frontend via query string (?token=...).
 * Deve bater com a variável ENV_TOKEN do .env.
 *
 * Ver: docs/FLUXO-CONFIGURACOES-PUBLICAS-BRANDING.md
 */

type TokenPayload = {
  token: string | undefined;
};

const envTokenAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { token: bodyToken } = req.body as TokenPayload;
    const { token: queryToken } = req.query as TokenPayload;

    console.log("|========= | middleware | ========|", req.query)


    if (queryToken === process.env.ENV_TOKEN) {
      return next();
    }

    if (bodyToken === process.env.ENV_TOKEN) {
      return next();
    }


  } catch (e) {
    console.log(e);
  }

  throw new AppError("Token inválido", 403);
};

export default envTokenAuth;
