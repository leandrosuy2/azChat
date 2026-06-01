import { QueryInterface, DataTypes } from "sequelize";

const TABLE = "TicketLembretes";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableInfo = await queryInterface.describeTable(TABLE);

    if (!tableInfo.notifyOnShare) {
      await queryInterface.addColumn(TABLE, "notifyOnShare", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!tableInfo.notifyShareGroupIds) {
      await queryInterface.addColumn(TABLE, "notifyShareGroupIds", {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null
      });
    }
    if (!tableInfo.quadroGroupId) {
      await queryInterface.addColumn(TABLE, "quadroGroupId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "QuadroGroups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableInfo = await queryInterface.describeTable(TABLE);
    if (tableInfo.quadroGroupId) {
      await queryInterface.removeColumn(TABLE, "quadroGroupId");
    }
    if (tableInfo.notifyShareGroupIds) {
      await queryInterface.removeColumn(TABLE, "notifyShareGroupIds");
    }
    if (tableInfo.notifyOnShare) {
      await queryInterface.removeColumn(TABLE, "notifyOnShare");
    }
  }
};
