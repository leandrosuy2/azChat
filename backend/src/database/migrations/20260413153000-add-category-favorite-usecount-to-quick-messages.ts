import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn(
        "QuickMessages",
        "category",
        {
          type: DataTypes.STRING,
          allowNull: true,
          defaultValue: null
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        "QuickMessages",
        "categoryColor",
        {
          type: DataTypes.STRING,
          allowNull: true,
          defaultValue: "#546E7A"
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        "QuickMessages",
        "useCount",
        {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        "QuickMessages",
        "isFavorite",
        {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        { transaction: t }
      );
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn("QuickMessages", "isFavorite", {
        transaction: t
      });
      await queryInterface.removeColumn("QuickMessages", "useCount", {
        transaction: t
      });
      await queryInterface.removeColumn("QuickMessages", "categoryColor", {
        transaction: t
      });
      await queryInterface.removeColumn("QuickMessages", "category", {
        transaction: t
      });
    });
  }
};
