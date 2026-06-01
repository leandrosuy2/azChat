import { QueryInterface, DataTypes } from "sequelize";

const TABLE = "Schedules";
const COLUMN = "scheduleCategory";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableInfo = await queryInterface.describeTable(TABLE);
    if (tableInfo[COLUMN]) {
      return;
    }
    await queryInterface.addColumn(TABLE, COLUMN, {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "scheduled_message"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    const tableInfo = await queryInterface.describeTable(TABLE);
    if (!tableInfo[COLUMN]) {
      return;
    }
    await queryInterface.removeColumn(TABLE, COLUMN);
  }
};
