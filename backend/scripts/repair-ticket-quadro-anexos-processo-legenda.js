#!/usr/bin/env node
/**
 * Aplica colunas processoBlocoId + legenda em TicketQuadroAnexos (PostgreSQL).
 *
 * Uso (na pasta do backend, com .env carregado):
 *   node scripts/repair-ticket-quadro-anexos-processo-legenda.js
 *
 * Se o erro for NOT NULL em ticketId em anexo de quadro livre:
 *   node scripts/repair-ticket-quadro-anexos-processo-legenda.js --ticketid-null
 */

"use strict";

require("dotenv").config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env" });

const { Client } = require("pg");

async function main() {
  const dialect = (process.env.DB_DIALECT || "postgres").toLowerCase();
  if (dialect !== "postgres" && dialect !== "postgresql") {
    console.error("Este script é só para PostgreSQL. DB_DIALECT=" + dialect);
    process.exit(1);
  }

  const wantTicketIdNull = process.argv.includes("--ticketid-null");

  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    ssl:
      process.env.DB_SSL === "true" || process.env.PGSSLMODE === "require"
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
        : false
  });

  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `ALTER TABLE "TicketQuadroAnexos" ADD COLUMN IF NOT EXISTS "processoBlocoId" VARCHAR(36)`
    );
    await client.query(`ALTER TABLE "TicketQuadroAnexos" ADD COLUMN IF NOT EXISTS "legenda" TEXT`);
    await client.query(
      `CREATE INDEX IF NOT EXISTS "TicketQuadroAnexos_processoBlocoId_idx" ON "TicketQuadroAnexos" ("processoBlocoId")`
    );

    if (wantTicketIdNull) {
      await client.query(`ALTER TABLE "TicketQuadroAnexos" ALTER COLUMN "ticketId" DROP NOT NULL`);
      console.log("OK: ticketId agora aceita NULL (quadro livre).");
    }

    await client.query("COMMIT");
    console.log("OK: processoBlocoId, legenda e índice aplicados em TicketQuadroAnexos.");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
