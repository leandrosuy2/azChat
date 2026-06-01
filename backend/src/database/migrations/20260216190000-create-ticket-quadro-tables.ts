import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("TicketQuadros", {
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
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "aguardando"
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE(6),
        allowNull: false
      }
    }).then(() =>
      queryInterface.addIndex("TicketQuadros", ["ticketId"], { unique: true })
    ).then(() =>
      queryInterface.createTable("TicketQuadroAnexos", {
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
        name: {
          type: DataTypes.STRING,
          allowNull: false
        },
        path: {
          type: DataTypes.STRING,
          allowNull: false
        },
        isCapa: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        createdAt: {
          type: DataTypes.DATE(6),
          allowNull: false
        }
      })
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("TicketQuadroAnexos").then(() =>
      queryInterface.dropTable("TicketQuadros")
    );
  }
};
