import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn("Contacts", "country", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "city", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "state", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "leadOrigin", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "entryDate", {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "exitDate", {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "dealValue", {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      }, { transaction });

      await queryInterface.addColumn("Contacts", "companyName", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "position", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "productsInterest", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn("Contacts", "observation", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
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
      await queryInterface.removeColumn("Contacts", "country", { transaction });
      await queryInterface.removeColumn("Contacts", "city", { transaction });
      await queryInterface.removeColumn("Contacts", "state", { transaction });
      await queryInterface.removeColumn("Contacts", "leadOrigin", { transaction });
      await queryInterface.removeColumn("Contacts", "entryDate", { transaction });
      await queryInterface.removeColumn("Contacts", "exitDate", { transaction });
      await queryInterface.removeColumn("Contacts", "dealValue", { transaction });
      await queryInterface.removeColumn("Contacts", "companyName", { transaction });
      await queryInterface.removeColumn("Contacts", "position", { transaction });
      await queryInterface.removeColumn("Contacts", "productsInterest", { transaction });
      await queryInterface.removeColumn("Contacts", "observation", { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
