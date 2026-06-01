import { QueryInterface, DataTypes } from "sequelize";

/**
 * Etapas do Kanban passam a ser por área (QuadroGroup), não mais compartilhadas por toda a empresa.
 * Tags kanban existentes são associadas à primeira área de cada empresa (por data de criação).
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn(
      "Tags",
      "quadroGroupId",
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "QuadroGroups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      }
    );

    const [rows] = await queryInterface.sequelize.query(
      `SELECT id, "companyId" FROM "QuadroGroups" ORDER BY "createdAt" ASC`
    );
    const firstByCompany = new Map<number, number>();
    for (const r of rows as { id: number; companyId: number }[]) {
      if (!firstByCompany.has(r.companyId)) {
        firstByCompany.set(r.companyId, r.id);
      }
    }
    for (const [companyId, groupId] of firstByCompany.entries()) {
      await queryInterface.sequelize.query(
        `UPDATE "Tags" SET "quadroGroupId" = :gid WHERE "kanban" = 1 AND "companyId" = :cid AND "quadroGroupId" IS NULL`,
        { replacements: { gid: groupId, cid: companyId } }
      );
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tags", "quadroGroupId");
  }
};
