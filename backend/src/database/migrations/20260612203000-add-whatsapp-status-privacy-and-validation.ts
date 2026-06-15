import { QueryInterface, DataTypes } from "sequelize";

const TABLE = "WhatsappStatusPublications";
type TableColumns = Record<string, unknown>;

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const table = (await queryInterface.describeTable(TABLE)) as TableColumns;

    if (!table.privacyMode) {
      await queryInterface.addColumn(TABLE, "privacyMode", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "contacts"
      });
    }

    if (!table.privacyContactIds) {
      await queryInterface.addColumn(TABLE, "privacyContactIds", {
        type: DataTypes.JSONB,
        allowNull: true
      });
    }

    if (!table.recipientCount) {
      await queryInterface.addColumn(TABLE, "recipientCount", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    if (!table.whatsappMessageId) {
      await queryInterface.addColumn(TABLE, "whatsappMessageId", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "whatsapp_status_publications_company_privacy_mode"
      ON "WhatsappStatusPublications" ("companyId", "privacyMode");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "whatsapp_status_publications_message_id"
      ON "WhatsappStatusPublications" ("whatsappMessageId");
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "whatsapp_status_publications_message_id";
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "whatsapp_status_publications_company_privacy_mode";
    `);

    const table = (await queryInterface.describeTable(TABLE)) as TableColumns;
    if (table.whatsappMessageId) await queryInterface.removeColumn(TABLE, "whatsappMessageId");
    if (table.recipientCount) await queryInterface.removeColumn(TABLE, "recipientCount");
    if (table.privacyContactIds) await queryInterface.removeColumn(TABLE, "privacyContactIds");
    if (table.privacyMode) await queryInterface.removeColumn(TABLE, "privacyMode");
  }
};
