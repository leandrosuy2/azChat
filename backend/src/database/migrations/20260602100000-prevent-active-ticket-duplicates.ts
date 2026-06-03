import { QueryInterface } from "sequelize";

const ACTIVE_STATUSES = "'open', 'pending', 'group', 'nps', 'lgpd'";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      WITH ranked AS (
        SELECT
          t."id",
          ROW_NUMBER() OVER (
            PARTITION BY
              t."companyId",
              COALESCE(t."whatsappId", 0),
              COALESCE(
                NULLIF(LOWER(TRIM(c."remoteJid")), ''),
                NULLIF(REGEXP_REPLACE(COALESCE(c."number", ''), '\\D', '', 'g'), ''),
                'contact:' || t."contactId"::text
              )
            ORDER BY t."updatedAt" DESC NULLS LAST, t."id" DESC
          ) AS rn
        FROM "Tickets" t
        JOIN "Contacts" c ON c."id" = t."contactId"
        WHERE t."status" IN (${ACTIVE_STATUSES})
          AND t."quadroGroupId" IS NULL
      )
      UPDATE "Tickets" t
      SET
        "status" = 'closed',
        "unreadMessages" = 0,
        "updatedAt" = NOW()
      FROM ranked r
      WHERE t."id" = r."id"
        AND r.rn > 1;
    `);

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION prevent_active_ticket_duplicates()
      RETURNS trigger AS $$
      DECLARE
        new_identity text;
      BEGIN
        IF NEW."status" NOT IN (${ACTIVE_STATUSES}) THEN
          RETURN NEW;
        END IF;

        IF NEW."quadroGroupId" IS NOT NULL THEN
          RETURN NEW;
        END IF;

        SELECT COALESCE(
          NULLIF(LOWER(TRIM(c."remoteJid")), ''),
          NULLIF(REGEXP_REPLACE(COALESCE(c."number", ''), '\\D', '', 'g'), ''),
          'contact:' || NEW."contactId"::text
        )
        INTO new_identity
        FROM "Contacts" c
        WHERE c."id" = NEW."contactId"
          AND c."companyId" = NEW."companyId";

        IF new_identity IS NULL OR TRIM(new_identity) = '' THEN
          new_identity := 'contact:' || NEW."contactId"::text;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM "Tickets" t
          JOIN "Contacts" c ON c."id" = t."contactId"
          WHERE t."id" <> COALESCE(NEW."id", 0)
            AND t."companyId" = NEW."companyId"
            AND COALESCE(t."whatsappId", 0) = COALESCE(NEW."whatsappId", 0)
            AND t."quadroGroupId" IS NULL
            AND t."status" IN (${ACTIVE_STATUSES})
            AND COALESCE(
              NULLIF(LOWER(TRIM(c."remoteJid")), ''),
              NULLIF(REGEXP_REPLACE(COALESCE(c."number", ''), '\\D', '', 'g'), ''),
              'contact:' || t."contactId"::text
            ) = new_identity
          LIMIT 1
        ) THEN
          RAISE EXCEPTION 'ERR_DUPLICATED_ACTIVE_TICKET';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS tickets_prevent_active_duplicates ON "Tickets";
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER tickets_prevent_active_duplicates
      BEFORE INSERT OR UPDATE OF "status", "contactId", "whatsappId", "companyId", "quadroGroupId"
      ON "Tickets"
      FOR EACH ROW
      EXECUTE FUNCTION prevent_active_ticket_duplicates();
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS tickets_prevent_active_duplicates ON "Tickets";
    `);

    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS prevent_active_ticket_duplicates();
    `);
  }
};
