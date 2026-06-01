import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn(
        "QuickMessages",
        "autoSend",
        {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        "QuickMessages",
        "useInSlash",
        {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        { transaction: t }
      );
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn("QuickMessages", "useInSlash", {
        transaction: t
      });
      await queryInterface.removeColumn("QuickMessages", "autoSend", {
        transaction: t
      });
    });
  }
};
