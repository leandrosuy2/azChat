import { DataTypes, QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Whatsapps", "metaAppId", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "metaAppSecret", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "metaVerifyToken", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "metaLastSyncAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Whatsapps", "metaLastSyncAt");
    await queryInterface.removeColumn("Whatsapps", "metaVerifyToken");
    await queryInterface.removeColumn("Whatsapps", "metaAppSecret");
    await queryInterface.removeColumn("Whatsapps", "metaAppId");
  }
};
