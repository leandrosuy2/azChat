import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Remove unique constraint que impede múltiplos contatos LID (sem número) por empresa
    await queryInterface.sequelize.query(`
      ALTER TABLE "Contacts"
      DROP CONSTRAINT IF EXISTS "number_companyid_unique"
    `);

    // Cria constraint parcial: unique só quando number não é vazio
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "number_companyid_unique"
      ON "Contacts" ("number", "companyId")
      WHERE number != ''
    `);

    // Limpa números LID salvos indevidamente como número de telefone
    await queryInterface.sequelize.query(`
      UPDATE "Contacts"
      SET number = ''
      WHERE "remoteJid" LIKE '%@lid'
        AND number ~ '^1[0-9]{13,15}$'
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "number_companyid_unique"
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Contacts"
      ADD CONSTRAINT "number_companyid_unique" UNIQUE ("number", "companyId")
    `);
  },
};
