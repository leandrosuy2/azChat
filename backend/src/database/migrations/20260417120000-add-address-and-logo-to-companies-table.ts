import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Companies", "address", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });
    await queryInterface.addColumn("Companies", "logo", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Companies", "address");
    await queryInterface.removeColumn("Companies", "logo");
  }
};
