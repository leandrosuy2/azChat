import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("TicketQuadros", "valorServico", {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
      }),
      queryInterface.addColumn("TicketQuadros", "valorEntrada", {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("TicketQuadros", "valorServico"),
      queryInterface.removeColumn("TicketQuadros", "valorEntrada")
    ]);
  }
};
