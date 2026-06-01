import { QueryInterface, DataTypes } from "sequelize";

/**
 * Anexos podem pertencer a um bloco de «Detalhes do processo» (UUID lógico em JSON no quadro).
 * legenda: descrição por imagem/arquivo.
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableDesc = await queryInterface.describeTable("TicketQuadroAnexos");

      if (!tableDesc["processoBlocoId"]) {
        await queryInterface.addColumn(
          "TicketQuadroAnexos",
          "processoBlocoId",
          {
            type: DataTypes.STRING(36),
            allowNull: true
          },
          { transaction }
        );
      }

      if (!tableDesc["legenda"]) {
        await queryInterface.addColumn(
          "TicketQuadroAnexos",
          "legenda",
          {
            type: DataTypes.TEXT,
            allowNull: true
          },
          { transaction }
        );
      }

      const indexes = await queryInterface.showIndex("TicketQuadroAnexos") as any[];
      const indexExists = indexes.some((i: any) => i.name === "TicketQuadroAnexos_processoBlocoId_idx");
      if (!indexExists) {
        await queryInterface.addIndex("TicketQuadroAnexos", ["processoBlocoId"], {
          name: "TicketQuadroAnexos_processoBlocoId_idx",
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
      await queryInterface.removeIndex("TicketQuadroAnexos", "TicketQuadroAnexos_processoBlocoId_idx", {
        transaction
      });
      await queryInterface.removeColumn("TicketQuadroAnexos", "legenda", { transaction });
      await queryInterface.removeColumn("TicketQuadroAnexos", "processoBlocoId", { transaction });
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
};
