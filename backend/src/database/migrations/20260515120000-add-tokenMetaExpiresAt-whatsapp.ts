import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Whatsapps", "tokenMetaExpiresAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
    await queryInterface.addColumn("Whatsapps", "metaConnectionError", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Whatsapps", "tokenMetaExpiresAt");
    await queryInterface.removeColumn("Whatsapps", "metaConnectionError");
  }
};
