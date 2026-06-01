import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Users", "permissions", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn("Users", "uiPreferences", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Users", "uiPreferences");
    await queryInterface.removeColumn("Users", "permissions");
  }
};
