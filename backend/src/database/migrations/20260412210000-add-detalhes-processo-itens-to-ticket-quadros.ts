import { QueryInterface, DataTypes } from "sequelize";

/** Campos dinâmicos em «Detalhes do processo»: JSON [{ id, titulo, descricao }] */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("TicketQuadros", "detalhesProcessoItens", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("TicketQuadros", "detalhesProcessoItens");
  }
};
