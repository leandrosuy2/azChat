import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const flowInfo = await queryInterface.describeTable("FlowBuilders");

    if (!flowInfo["channels"]) {
      await queryInterface.addColumn("FlowBuilders", "channels", {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: ["whatsapp", "facebook", "instagram"]
      });
    }

    const tables = await queryInterface.showAllTables();
    if (!tables.map(String).includes("MetaEventLogs")) {
      await queryInterface.createTable("MetaEventLogs", {
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
        whatsappId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "Whatsapps", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        channel: {
          type: DataTypes.STRING(32),
          allowNull: false
        },
        direction: {
          type: DataTypes.STRING(16),
          allowNull: false
        },
        eventType: {
          type: DataTypes.STRING(64),
          allowNull: false
        },
        externalId: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: "received"
        },
        errorMessage: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        payload: {
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

      await queryInterface.addIndex("MetaEventLogs", ["companyId", "createdAt"], {
        name: "MetaEventLogs_company_created_idx"
      });
      await queryInterface.addIndex("MetaEventLogs", ["whatsappId", "createdAt"], {
        name: "MetaEventLogs_whatsapp_created_idx"
      });
      await queryInterface.addIndex("MetaEventLogs", ["channel", "eventType"], {
        name: "MetaEventLogs_channel_event_idx"
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.map(String).includes("MetaEventLogs")) {
      await queryInterface.dropTable("MetaEventLogs");
    }

    const flowInfo = await queryInterface.describeTable("FlowBuilders");
    if (flowInfo["channels"]) {
      await queryInterface.removeColumn("FlowBuilders", "channels");
    }
  }
};
