import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.createTable("WhatsappStatusPublications", {
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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      whatsappId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Whatsapps", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      contentType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "text"
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      mediaPath: {
        type: DataTypes.STRING,
        allowNull: true
      },
      mediaName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      mediaType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "draft"
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      failureReason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      audit: {
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

    await queryInterface.addIndex("WhatsappStatusPublications", ["companyId", "status"]);
    await queryInterface.addIndex("WhatsappStatusPublications", ["status", "scheduledAt"]);
    await queryInterface.addIndex("WhatsappStatusPublications", ["whatsappId", "createdAt"]);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.dropTable("WhatsappStatusPublications");
  }
};
