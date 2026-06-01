import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("Products", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      category: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      code: {
        type: DataTypes.STRING(80),
        allowNull: true
      },
      price: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "active"
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });
    await queryInterface.addIndex("Products", ["companyId"]);
    await queryInterface.addIndex("Products", ["companyId", "status"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("Products");
  }
};
