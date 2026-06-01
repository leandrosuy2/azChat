import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Helps", "content", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("Helps", "areaKey", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addIndex("Helps", ["areaKey"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("Helps", ["areaKey"]);
    await queryInterface.removeColumn("Helps", "areaKey");
    await queryInterface.removeColumn("Helps", "content");
  }
};
