import { QueryInterface, DataTypes } from "sequelize";

const TABLE = "TicketLembretes";

type TableColumns = Record<string, unknown>;

const hasColumn = (tableInfo: TableColumns, name: string): boolean =>
  Boolean(tableInfo[name]);

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableInfo = (await queryInterface.describeTable(
      TABLE
    )) as TableColumns;

    if (!hasColumn(tableInfo, "notifyOnShare")) {
      await queryInterface.addColumn(TABLE, "notifyOnShare", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!hasColumn(tableInfo, "notifyShareGroupIds")) {
      await queryInterface.addColumn(TABLE, "notifyShareGroupIds", {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null
      });
    }
    if (!hasColumn(tableInfo, "quadroGroupId")) {
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
    const tableInfo = (await queryInterface.describeTable(
      TABLE
    )) as TableColumns;
    if (hasColumn(tableInfo, "quadroGroupId")) {
      await queryInterface.removeColumn(TABLE, "quadroGroupId");
    }
    if (hasColumn(tableInfo, "notifyShareGroupIds")) {
      await queryInterface.removeColumn(TABLE, "notifyShareGroupIds");
    }
    if (hasColumn(tableInfo, "notifyOnShare")) {
      await queryInterface.removeColumn(TABLE, "notifyOnShare");
    }
  }
};
