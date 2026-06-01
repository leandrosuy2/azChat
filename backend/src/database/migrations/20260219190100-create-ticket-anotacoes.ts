import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("TicketAnotacoes", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      eventoId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "TicketEventos", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      texto: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      arquivoNome: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      arquivoPath: {
        type: DataTypes.STRING(1000),
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "aberta"
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
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("TicketAnotacoes");
  }
};
