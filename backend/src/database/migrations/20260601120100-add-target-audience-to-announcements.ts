import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Announcements", "targetAudience", {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: "internal"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Announcements", "targetAudience");
  }
};
