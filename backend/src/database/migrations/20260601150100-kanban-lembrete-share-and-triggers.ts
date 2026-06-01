import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("TicketLembretes", "notifyOnShare", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addColumn("TicketLembretes", "notifyShareGroupIds", {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn("TicketLembretes", "quadroGroupId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "QuadroGroups", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("TicketLembretes", "quadroGroupId");
    await queryInterface.removeColumn("TicketLembretes", "notifyShareGroupIds");
    await queryInterface.removeColumn("TicketLembretes", "notifyOnShare");
  }
};
