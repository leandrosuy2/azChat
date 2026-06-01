import { QueryInterface, DataTypes } from "sequelize";

/**
 * Anexos do quadro podem pertencer a um Ticket (ticketId) ou a um quadro livre (ticketQuadroId).
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableDesc = await queryInterface.describeTable("TicketQuadroAnexos");

      if (!tableDesc["ticketQuadroId"]) {
        await queryInterface.addColumn(
          "TicketQuadroAnexos",
          "ticketQuadroId",
          {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "TicketQuadros", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          { transaction }
        );
      }

      await queryInterface.changeColumn(
        "TicketQuadroAnexos",
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

      const indexes = await queryInterface.showIndex("TicketQuadroAnexos") as any[];
      const indexExists = indexes.some((i: any) => i.name === "TicketQuadroAnexos_ticketQuadroId_idx");
      if (!indexExists) {
        await queryInterface.addIndex("TicketQuadroAnexos", ["ticketQuadroId"], {
          name: "TicketQuadroAnexos_ticketQuadroId_idx",
          transaction
        });
      }

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex("TicketQuadroAnexos", "TicketQuadroAnexos_ticketQuadroId_idx", {
        transaction
      });
      await queryInterface.removeColumn("TicketQuadroAnexos", "ticketQuadroId", { transaction });
      await queryInterface.changeColumn(
        "TicketQuadroAnexos",
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
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
};
