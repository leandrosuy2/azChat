import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    const table = await queryInterface.describeTable("WhatsappStatusPublications");

    if (!table.privacyMode) {
      await queryInterface.addColumn("WhatsappStatusPublications", "privacyMode", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "contacts"
      });
    }

    if (!table.privacyContactIds) {
      await queryInterface.addColumn("WhatsappStatusPublications", "privacyContactIds", {
        type: DataTypes.JSONB,
        allowNull: true
      });
    }

    if (!table.recipientCount) {
      await queryInterface.addColumn("WhatsappStatusPublications", "recipientCount", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    if (!table.whatsappMessageId) {
      await queryInterface.addColumn("WhatsappStatusPublications", "whatsappMessageId", {
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

    const table = await queryInterface.describeTable("WhatsappStatusPublications");
    if (table.whatsappMessageId) await queryInterface.removeColumn("WhatsappStatusPublications", "whatsappMessageId");
    if (table.recipientCount) await queryInterface.removeColumn("WhatsappStatusPublications", "recipientCount");
    if (table.privacyContactIds) await queryInterface.removeColumn("WhatsappStatusPublications", "privacyContactIds");
    if (table.privacyMode) await queryInterface.removeColumn("WhatsappStatusPublications", "privacyMode");
  }
};
