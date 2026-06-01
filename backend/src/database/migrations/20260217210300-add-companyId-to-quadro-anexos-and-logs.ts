import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn("TicketQuadroAnexos", "companyId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      }, { transaction });

      await queryInterface.addColumn("QuadroStatusLogs", "companyId", {
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
      await queryInterface.removeColumn("TicketQuadroAnexos", "companyId", { transaction });
      await queryInterface.removeColumn("QuadroStatusLogs", "companyId", { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
