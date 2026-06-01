import { QueryInterface, DataTypes } from "sequelize";

const TABLE = "Announcements";
const COLUMN = "targetAudience";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableInfo = await queryInterface.describeTable(TABLE);
    if (tableInfo[COLUMN]) {
      return;
    }
    await queryInterface.addColumn(TABLE, COLUMN, {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: "internal"
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
