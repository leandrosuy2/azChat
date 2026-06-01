import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("CompanyLifecycleEvents", {
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
      eventType: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "SET NULL",
        onDelete: "SET NULL"
      },
      previousStatus: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      newStatus: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true
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
    await queryInterface.addIndex("CompanyLifecycleEvents", ["companyId"]);
    await queryInterface.addIndex("CompanyLifecycleEvents", ["companyId", "createdAt"]);
    await queryInterface.addIndex("CompanyLifecycleEvents", ["eventType"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("CompanyLifecycleEvents");
  }
};
