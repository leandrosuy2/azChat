import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        "TicketQuadros",
        "linkType",
        {
          type: DataTypes.STRING(20),
          allowNull: true,
          defaultValue: "linked"
        },
        { transaction }
      );
      await queryInterface.addColumn(
        "TicketQuadros",
        "sharedStagesByGroup",
        {
          type: DataTypes.TEXT,
          allowNull: true,
          defaultValue: null
        },
        { transaction }
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
  down: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("TicketQuadros", "linkType", { transaction });
      await queryInterface.removeColumn("TicketQuadros", "sharedStagesByGroup", { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
