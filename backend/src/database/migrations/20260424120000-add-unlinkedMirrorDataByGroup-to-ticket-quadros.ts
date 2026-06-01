import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const qi = queryInterface.sequelize;
    const dialect = qi.getDialect();
    if (dialect !== "postgres") {
      return;
    }
    await qi.query(`
      ALTER TABLE "TicketQuadros" ADD COLUMN IF NOT EXISTS "unlinkedMirrorDataByGroup" TEXT;
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    const qi = queryInterface.sequelize;
    const dialect = qi.getDialect();
    if (dialect !== "postgres") {
      return;
    }
    await qi.query(`
      ALTER TABLE "TicketQuadros" DROP COLUMN IF EXISTS "unlinkedMirrorDataByGroup";
    `);
  }
};
