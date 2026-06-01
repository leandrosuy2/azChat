import os from "os";
import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import cron from "node-cron";
import { initIO } from "./libs/socket";
import logger from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import Company from "./models/Company";
import BullQueue from './libs/queue';

import { startQueueProcess } from "./queues";
// import { ScheduledMessagesJob, ScheduleMessagesGenerateJob, ScheduleMessagesEnvioJob, ScheduleMessagesEnvioForaHorarioJob } from "./wbotScheduledMessages";

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, async () => {
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : PORT;
  const localUrl = `http://localhost:${port}`;

  const nets = os.networkInterfaces();
  const networkUrls: string[] = [];
  for (const name of Object.keys(nets || {})) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        networkUrls.push(`http://${net.address}:${port}`);
      }
    }
  }

  console.log("\n----------------------------------------");
  console.log("  Backend rodando");
  console.log("----------------------------------------");
  console.log(`  URL local:   ${localUrl}`);
  if (networkUrls.length > 0) {
    networkUrls.forEach((url, i) => {
      console.log(`  URL rede:    ${url}`);
    });
  }
  console.log(`  Porta:       ${port}`);
  console.log("----------------------------------------\n");

  logger.info(`Server started on port: ${port}`);

  const companies = await Company.findAll({
    where: { status: true },
    attributes: ["id"]
  });

  const allPromises: any[] = [];
  companies.map(async c => {
    const promise = StartAllWhatsAppsSessions(c.id);
    allPromises.push(promise);
  });

  Promise.all(allPromises).then(async () => {

    await startQueueProcess();
  });

  if (process.env.REDIS_URI_ACK && process.env.REDIS_URI_ACK !== '') {
    BullQueue.process();
  }
});

/**
 * Política de erro: NÃO derrubar o backend por erros recuperáveis vindos do
 * Baileys (Connection Closed, decrypt failure, timeout WS, etc.). Antes, qualquer
 * unhandledRejection chamava process.exit(1) e o PM2 reiniciava o processo —
 * o que matava todas as sessões WhatsApp e fazia mensagens novas se perderem
 * durante a janela de reconexão. Esse era o "app caindo constantemente".
 *
 * Para erros realmente fatais (porta em uso, falha no DB pool no boot, OOM, etc.)
 * mantemos o exit, mas com lista explícita de gatilhos.
 */
const FATAL_ERROR_PATTERNS = [
  /EADDRINUSE/i,
  /ECONNREFUSED.*5432/i, // postgres no boot
  /Sequelize.*ConnectionError/i,
  /JavaScript heap out of memory/i
];

const isFatal = (msg: string): boolean =>
  FATAL_ERROR_PATTERNS.some(rx => rx.test(msg));

process.on("uncaughtException", err => {
  const msg = err?.message || String(err);
  logger.error(
    `uncaughtException: ${msg}${err?.stack ? "\n" + err.stack : ""}`
  );
  if (isFatal(msg)) {
    logger.error("Erro fatal detectado, encerrando processo para PM2 reiniciar.");
    setTimeout(() => process.exit(1), 500);
  }
  // Caso contrário, mantém o processo vivo — Baileys reconecta sozinho.
});

process.on("unhandledRejection", (reason: any) => {
  const msg =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : JSON.stringify(reason);
  logger.warn(
    `unhandledRejection: ${msg}${
      reason instanceof Error && reason.stack ? "\n" + reason.stack : ""
    }`
  );
  if (isFatal(msg)) {
    logger.error("Rejection fatal, encerrando processo para PM2 reiniciar.");
    setTimeout(() => process.exit(1), 500);
  }
  // Connection Closed / decrypt errors / etc → seguimos vivos.
});

// cron.schedule("* * * * * *", async () => {

//   try {
//     // console.log("Running a job at 5 minutes at America/Sao_Paulo timezone")
//     await ScheduledMessagesJob();
//     await ScheduleMessagesGenerateJob();
//   }
//   catch (error) {
//     logger.error(error);
//   }

// });

// cron.schedule("* * * * * *", async () => {

//   try {
//     // console.log("Running a job at 01:00 at America/Sao_Paulo timezone")
//     console.log("Running a job at 2 minutes at America/Sao_Paulo timezone")
//     await ScheduleMessagesEnvioJob();
//     await ScheduleMessagesEnvioForaHorarioJob()
//   }
//   catch (error) {
//     logger.error(error);
//   }

// });

initIO(server);
gracefulShutdown(server);
