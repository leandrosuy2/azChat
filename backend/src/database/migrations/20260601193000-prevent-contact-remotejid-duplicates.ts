import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION prevent_contact_remotejid_duplicates()
      RETURNS trigger AS $$
      BEGIN
        IF NEW."remoteJid" IS NULL OR TRIM(NEW."remoteJid") = '' THEN
          RETURN NEW;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM "Contacts" c
          WHERE c."companyId" = NEW."companyId"
            AND COALESCE(c."channel", 'whatsapp') = COALESCE(NEW."channel", 'whatsapp')
            AND LOWER(TRIM(c."remoteJid")) = LOWER(TRIM(NEW."remoteJid"))
            AND c."id" <> COALESCE(NEW."id", 0)
          LIMIT 1
        ) THEN
          RAISE EXCEPTION 'ERR_DUPLICATED_CONTACT_REMOTEJID';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS contacts_prevent_remotejid_duplicates ON "Contacts";
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER contacts_prevent_remotejid_duplicates
      BEFORE INSERT OR UPDATE OF "remoteJid", "companyId", "channel"
      ON "Contacts"
      FOR EACH ROW
      EXECUTE FUNCTION prevent_contact_remotejid_duplicates();
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS contacts_prevent_remotejid_duplicates ON "Contacts";
    `);

    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS prevent_contact_remotejid_duplicates();
    `);
  }
};
