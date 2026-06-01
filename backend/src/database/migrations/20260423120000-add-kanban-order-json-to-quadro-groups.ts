import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const qi = queryInterface.sequelize;
    const dialect = qi.getDialect();
    if (dialect === "postgres") {
      await qi.query(
        `ALTER TABLE "QuadroGroups" ADD COLUMN IF NOT EXISTS "kanbanCardsOrderJson" TEXT;`
      );
      await qi.query(
        `ALTER TABLE "QuadroGroups" ADD COLUMN IF NOT EXISTS "kanbanColumnOrderJson" TEXT;`
      );
      return;
    }
    try {
      await queryInterface.addColumn("QuadroGroups", "kanbanCardsOrderJson", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    } catch {
      /* coluna já existe */
    }
    try {
      await queryInterface.addColumn("QuadroGroups", "kanbanColumnOrderJson", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    } catch {
      /* coluna já existe */
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("QuadroGroups", "kanbanCardsOrderJson").catch(() => {});
    await queryInterface.removeColumn("QuadroGroups", "kanbanColumnOrderJson").catch(() => {});
  }
};
