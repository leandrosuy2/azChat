import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        "TicketQuadros",
        "uuid",
        {
          type: DataTypes.STRING(36),
          allowNull: true
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `UPDATE "TicketQuadros" SET uuid = gen_random_uuid()::text WHERE uuid IS NULL;`,
        { transaction }
      );

      await queryInterface.changeColumn(
        "TicketQuadros",
        "uuid",
        {
          type: DataTypes.STRING(36),
          allowNull: false
        },
        { transaction }
      );

      await queryInterface.addIndex("TicketQuadros", ["uuid"], {
        unique: true,
        name: "TicketQuadros_uuid_key",
        transaction
      });

      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "TicketQuadros_ticketId_key";`,
        { transaction }
      );

      await queryInterface.changeColumn(
        "TicketQuadros",
        "ticketId",
        {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "Tickets", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX "TicketQuadros_ticketId_unique_not_null"
         ON "TicketQuadros" ("ticketId")
         WHERE "ticketId" IS NOT NULL;`,
        { transaction }
      );

      await queryInterface.addColumn(
        "TicketQuadros",
        "linkedContactId",
        {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "Contacts", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "TicketQuadros",
        "kanbanTagId",
        {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "Tags", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        { transaction }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `DELETE FROM "TicketQuadros" WHERE "ticketId" IS NULL;`,
        { transaction }
      );

      await queryInterface.removeColumn("TicketQuadros", "kanbanTagId", { transaction });
      await queryInterface.removeColumn("TicketQuadros", "linkedContactId", { transaction });

      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "TicketQuadros_ticketId_unique_not_null";`,
        { transaction }
      );

      await queryInterface.changeColumn(
        "TicketQuadros",
        "ticketId",
        {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "Tickets", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        { transaction }
      );

      await queryInterface.addIndex("TicketQuadros", ["ticketId"], {
        unique: true,
        name: "TicketQuadros_ticketId_key",
        transaction
      });

      await queryInterface.removeIndex("TicketQuadros", "TicketQuadros_uuid_key", { transaction });
      await queryInterface.removeColumn("TicketQuadros", "uuid", { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
