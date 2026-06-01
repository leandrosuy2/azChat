import { QueryInterface } from "sequelize";

/**
 * Repara bases onde "SequelizeMeta" já lista migrations antigas mas o schema
 * de "TicketQuadros" ficou incompleto (deploy sem build, restore parcial, etc.).
 * Usa ADD COLUMN IF NOT EXISTS (PostgreSQL 9.1+).
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const qi = queryInterface.sequelize;
    const dialect = qi.getDialect();
    if (dialect !== "postgres") {
      return;
    }

    const run = async (sql: string) => {
      await qi.query(sql);
    };

    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "nomeProjeto" VARCHAR(255);
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "customFields" TEXT;
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "detalhesProcesso" TEXT;
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "detalhesProcessoItens" TEXT;
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "quadroGroupId" INTEGER
        REFERENCES "QuadroGroups" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "sharedGroupIds" TEXT;
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "companyId" INTEGER
        REFERENCES "Companies" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "valorServico" DECIMAL(12,2);
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "valorEntrada" DECIMAL(12,2);
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "uuid" VARCHAR(36);
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "linkedContactId" INTEGER
        REFERENCES "Contacts" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "kanbanTagId" INTEGER
        REFERENCES "Tags" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "linkType" VARCHAR(20) DEFAULT 'linked';
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "sharedStagesByGroup" TEXT;
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "unlinkedMirrorDataByGroup" TEXT;
    `);

    // Standalone: ticketId pode ser NULL (migration 20260411120000)
    await run(`
      ALTER TABLE "TicketQuadros" ALTER COLUMN "ticketId" DROP NOT NULL;
    `);

    // Preencher uuid em linhas antigas (standalone / reparação)
    await run(`
      UPDATE "TicketQuadros" SET "uuid" = gen_random_uuid()::text WHERE "uuid" IS NULL;
    `);

    await run(`
      CREATE UNIQUE INDEX IF NOT EXISTS "TicketQuadros_uuid_key" ON "TicketQuadros" ("uuid");
    `);

    await run(`
      DROP INDEX IF EXISTS "TicketQuadros_ticketId_key";
    `);
    await run(`
      CREATE UNIQUE INDEX IF NOT EXISTS "TicketQuadros_ticketId_unique_not_null"
        ON "TicketQuadros" ("ticketId") WHERE "ticketId" IS NOT NULL;
    `);

    // Anexos: quadro livre usa ticketQuadroId; ticketId pode ser NULL (migration 20260420130000)
    await run(`
      ALTER TABLE "TicketQuadroAnexos" ADD COLUMN IF NOT EXISTS "ticketQuadroId" INTEGER
        REFERENCES "TicketQuadros" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
    `);
    await run(`
      ALTER TABLE "TicketQuadroAnexos" ALTER COLUMN "ticketId" DROP NOT NULL;
    `);
    await run(`
      CREATE INDEX IF NOT EXISTS "TicketQuadroAnexos_ticketQuadroId_idx" ON "TicketQuadroAnexos" ("ticketQuadroId");
    `);
    await run(`
      ALTER TABLE "TicketQuadroAnexos" ADD COLUMN IF NOT EXISTS "processoBlocoId" VARCHAR(36);
    `);
    await run(`
      ALTER TABLE "TicketQuadroAnexos" ADD COLUMN IF NOT EXISTS "legenda" TEXT;
    `);
    await run(`
      CREATE INDEX IF NOT EXISTS "TicketQuadroAnexos_processoBlocoId_idx" ON "TicketQuadroAnexos" ("processoBlocoId");
    `);

    await run(`
      ALTER TABLE "TicketLembretes" ADD COLUMN IF NOT EXISTS "tipoGatilho" VARCHAR(32) DEFAULT 'agendado';
    `);
    await run(`
      ALTER TABLE "TicketLembretes" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN DEFAULT true;
    `);
    await run(`
      ALTER TABLE "TicketLembretes" ADD COLUMN IF NOT EXISTS "mensagemTemplate" TEXT;
    `);
    await run(`
      ALTER TABLE "TicketLembretes" ADD COLUMN IF NOT EXISTS "destinoTipo" VARCHAR(32);
    `);
    await run(`
      ALTER TABLE "TicketLembretes" ADD COLUMN IF NOT EXISTS "destinoId" INTEGER;
    `);
    await run(`
      ALTER TABLE "TicketLembretes" ADD COLUMN IF NOT EXISTS "diasAntecedencia" INTEGER;
    `);
    await run(`
      ALTER TABLE "TicketLembretes" ADD COLUMN IF NOT EXISTS "ultimoDisparoEm" DATE;
    `);
    await run(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "dataPrazo" DATE;
    `);
  },

  down: async () => {
    // irreversível: reparação de schema
  }
};
