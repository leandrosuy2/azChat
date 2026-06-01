import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("TicketEventos", {
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
      setor: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      responsavel: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      tipo: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      data: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      hora: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      localizacao: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true
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
    await queryInterface.dropTable("TicketEventos");
  }
};
