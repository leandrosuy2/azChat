import { QueryInterface, DataTypes } from "sequelize";

/** Texto longo para etapas do processo / observações (fora dos customFields JSON curtos). */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("TicketQuadros", "detalhesProcesso", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("TicketQuadros", "detalhesProcesso");
  }
};
