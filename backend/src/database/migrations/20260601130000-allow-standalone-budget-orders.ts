import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn("TicketBudgetOrders", "budgetId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "TicketBudgets", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    try {
      await queryInterface.removeIndex(
        "TicketBudgetOrders",
        "ticket_budget_orders_budget_id"
      );
    } catch {
      /* índice pode ter nome diferente conforme ambiente */
    }
    try {
      await queryInterface.removeIndex("TicketBudgetOrders", ["budgetId"]);
    } catch {
      /* noop */
    }
    await queryInterface.addIndex("TicketBudgetOrders", ["contactId"], {
      name: "ticket_budget_orders_contact_id"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex(
      "TicketBudgetOrders",
      "ticket_budget_orders_contact_id"
    );
    await queryInterface.changeColumn("TicketBudgetOrders", "budgetId", {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "TicketBudgets", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    });
    await queryInterface.addIndex("TicketBudgetOrders", ["budgetId"], {
      unique: true
    });
  }
};
