import { QueryInterface } from "sequelize";

/**
 * Remove mensagens duplicadas (mesmo wid + companyId) mantendo a de menor id,
 * e cria UNIQUE INDEX (wid, companyId) — base para que CreateMessageService
 * (Message.upsert) consiga, de fato, fazer ON CONFLICT em vez de INSERT cego.
 *
 * Antes desta migration o índice idx_messages_wid existia mas era btree não-unique,
 * então o upsert do Sequelize caía para a PK (id) e duplicava em race conditions.
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1) Apaga duplicatas mantendo a linha mais antiga por par (wid, companyId).
    //    "wid IS NOT NULL" para não tocar linhas legadas sem wid.
    await queryInterface.sequelize.query(`
      DELETE FROM "Messages" m
      USING "Messages" m2
      WHERE m.wid IS NOT NULL
        AND m.wid = m2.wid
        AND m."companyId" IS NOT DISTINCT FROM m2."companyId"
        AND m.id > m2.id;
    `);

    // 2) Remove o índice antigo (não-unique) para não duplicar índice em wid.
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_messages_wid;
    `);

    // 3) Cria índice UNIQUE composto. Permite múltiplas linhas com wid NULL
    //    (mensagens internas/privadas que usam wid sintético "PVT…").
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "messages_wid_company_unique"
      ON "Messages" (wid, "companyId")
      WHERE wid IS NOT NULL;
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "messages_wid_company_unique";
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_wid ON "Messages" (wid);
    `);
  }
};
