import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("TicketLembretes", {
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
      nome: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      data: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      hora: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      addGoogle: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    await queryInterface.dropTable("TicketLembretes");
  }
};
