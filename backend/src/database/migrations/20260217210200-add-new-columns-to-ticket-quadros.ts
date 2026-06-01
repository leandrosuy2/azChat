import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn("TicketQuadros", "nomeProjeto", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("TicketQuadros", "customFields", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("TicketQuadros", "quadroGroupId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "QuadroGroups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      }, { transaction });

      await queryInterface.addColumn("TicketQuadros", "sharedGroupIds", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("TicketQuadros", "companyId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      }, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
  down: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("TicketQuadros", "nomeProjeto", { transaction });
      await queryInterface.removeColumn("TicketQuadros", "customFields", { transaction });
      await queryInterface.removeColumn("TicketQuadros", "quadroGroupId", { transaction });
      await queryInterface.removeColumn("TicketQuadros", "sharedGroupIds", { transaction });
      await queryInterface.removeColumn("TicketQuadros", "companyId", { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
