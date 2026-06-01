import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("TicketLembretes", "antecedenciaMinutos", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn("TicketLembretes", "ultimoDisparoAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.createTable("TicketLembreteDisparos", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      lembreteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "TicketLembretes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
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
      tipoGatilho: {
        type: DataTypes.STRING(40),
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(24),
        allowNull: false
      },
      canalInterno: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      canalWhatsapp: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      corpo: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      erroWhatsapp: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("TicketLembreteDisparos", ["lembreteId"], {
      name: "TicketLembreteDisparos_lembreteId_idx"
    });
    await queryInterface.addIndex("TicketLembreteDisparos", ["ticketId", "createdAt"], {
      name: "TicketLembreteDisparos_ticket_created_idx"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("TicketLembreteDisparos", "TicketLembreteDisparos_ticket_created_idx");
    await queryInterface.removeIndex("TicketLembreteDisparos", "TicketLembreteDisparos_lembreteId_idx");
    await queryInterface.dropTable("TicketLembreteDisparos");
    await queryInterface.removeColumn("TicketLembretes", "ultimoDisparoAt");
    await queryInterface.removeColumn("TicketLembretes", "antecedenciaMinutos");
  }
};
