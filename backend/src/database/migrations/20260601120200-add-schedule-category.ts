import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Schedules", "scheduleCategory", {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "scheduled_message"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Schedules", "scheduleCategory");
  }
};
