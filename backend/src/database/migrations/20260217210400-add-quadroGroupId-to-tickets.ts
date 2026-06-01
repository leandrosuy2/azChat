import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "quadroGroupId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "QuadroGroups", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "quadroGroupId");
  }
};
