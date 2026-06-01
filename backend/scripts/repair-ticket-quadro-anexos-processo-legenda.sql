-- Reparação manual: colunas usadas pelo upload de anexos do quadro (processo + legenda).
-- Uso no servidor (PostgreSQL):
--   psql "$DATABASE_URL" -f scripts/repair-ticket-quadro-anexos-processo-legenda.sql
-- ou:
--   psql -h HOST -U USER -d DBNAME -f scripts/repair-ticket-quadro-anexos-processo-legenda.sql

BEGIN;

ALTER TABLE "TicketQuadroAnexos" ADD COLUMN IF NOT EXISTS "processoBlocoId" VARCHAR(36);
ALTER TABLE "TicketQuadroAnexos" ADD COLUMN IF NOT EXISTS "legenda" TEXT;

CREATE INDEX IF NOT EXISTS "TicketQuadroAnexos_processoBlocoId_idx"
  ON "TicketQuadroAnexos" ("processoBlocoId");

-- Quadro livre (sem ticket): anexo com ticketId NULL — só rode se o erro for NOT NULL em ticketId
-- ALTER TABLE "TicketQuadroAnexos" ALTER COLUMN "ticketId" DROP NOT NULL;

COMMIT;
