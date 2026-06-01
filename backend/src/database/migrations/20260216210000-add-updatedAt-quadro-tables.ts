import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("QuadroStatusLogs", "updatedAt", {
      type: DataTypes.DATE(6),
      allowNull: true
    }).then(() => {
      return queryInterface.sequelize.query(
        'UPDATE "QuadroStatusLogs" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL'
      );
    }).then(() => {
      return queryInterface.changeColumn("QuadroStatusLogs", "updatedAt", {
        type: DataTypes.DATE(6),
        allowNull: false
      });
    }).then(() => {
      return queryInterface.addColumn("TicketQuadroAnexos", "updatedAt", {
        type: DataTypes.DATE(6),
        allowNull: true
      });
    }).then(() => {
      return queryInterface.sequelize.query(
        'UPDATE "TicketQuadroAnexos" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL'
      );
    }).then(() => {
      return queryInterface.changeColumn("TicketQuadroAnexos", "updatedAt", {
        type: DataTypes.DATE(6),
        allowNull: false
      });
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("QuadroStatusLogs", "updatedAt").then(() =>
      queryInterface.removeColumn("TicketQuadroAnexos", "updatedAt")
    );
  }
};
