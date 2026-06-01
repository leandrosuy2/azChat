import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "TicketBudgets",
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
          },
          companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "Companies", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          ticketId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "Tickets", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL"
          },
          contactId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "Contacts", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL"
          },
          userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "Users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL"
          },
          publicToken: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true
          },
          budgetNumber: {
            type: DataTypes.STRING(40),
            allowNull: false
          },
          status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "pending"
          },
          validUntil: {
            type: DataTypes.DATEONLY,
            allowNull: true
          },
          payload: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {}
          },
          signatureSignerName: {
            type: DataTypes.STRING(255),
            allowNull: true
          },
          signatureImage: {
            type: DataTypes.TEXT,
            allowNull: true
          },
          signedAt: {
            type: DataTypes.DATE,
            allowNull: true
          },
          signerIp: {
            type: DataTypes.STRING(64),
            allowNull: true
          },
          rejectedAt: {
            type: DataTypes.DATE,
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
        },
        { transaction }
      );

      await queryInterface.addIndex("TicketBudgets", ["companyId"], { transaction });
      await queryInterface.addIndex("TicketBudgets", ["ticketId"], { transaction });
      await queryInterface.addIndex("TicketBudgets", ["publicToken"], {
        unique: true,
        transaction
      });

      await queryInterface.createTable(
        "TicketBudgetOrders",
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
          },
          companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "Companies", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          budgetId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "TicketBudgets", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE"
          },
          ticketId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "Tickets", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL"
          },
          contactId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "Contacts", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL"
          },
          orderNumber: {
            type: DataTypes.STRING(40),
            allowNull: false
          },
          total: {
            type: DataTypes.DECIMAL(14, 2),
            allowNull: false,
            defaultValue: 0
          },
          items: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: []
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
          }
        },
        { transaction }
      );

      await queryInterface.addIndex("TicketBudgetOrders", ["companyId"], { transaction });
      await queryInterface.addIndex("TicketBudgetOrders", ["budgetId"], {
        unique: true,
        transaction
      });

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable("TicketBudgetOrders", { transaction });
      await queryInterface.dropTable("TicketBudgets", { transaction });
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
};
