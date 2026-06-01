import { QueryInterface, DataTypes } from "sequelize";

/**
 * Status internos do quadro (Aguardando, Em andamento…) passam a ser por área de trabalho.
 * Linhas existentes são vinculadas à primeira QuadroGroup de cada empresa.
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn(
      "QuadroStatuses",
      "quadroGroupId",
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "QuadroGroups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      }
    );

    await queryInterface.sequelize.query(`
      UPDATE "QuadroStatuses" q
      SET "quadroGroupId" = (
        SELECT g.id FROM "QuadroGroups" g
        WHERE g."companyId" = q."companyId"
        ORDER BY g."createdAt" ASC
        LIMIT 1
      )
      WHERE q."quadroGroupId" IS NULL
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("QuadroStatuses", "quadroGroupId");
  }
};
