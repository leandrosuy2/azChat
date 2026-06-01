import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const t = await queryInterface.sequelize.transaction();
    try {
      const lembrDesc = await queryInterface.describeTable("TicketLembretes");
      const quadroDesc = await queryInterface.describeTable("TicketQuadros");

      if (!lembrDesc["tipoGatilho"]) {
        await queryInterface.addColumn(
          "TicketLembretes",
          "tipoGatilho",
          {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: "agendado"
          },
          { transaction: t }
        );
      }
      if (!lembrDesc["ativo"]) {
        await queryInterface.addColumn(
          "TicketLembretes",
          "ativo",
          {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
          },
          { transaction: t }
        );
      }
      if (!lembrDesc["mensagemTemplate"]) {
        await queryInterface.addColumn(
          "TicketLembretes",
          "mensagemTemplate",
          {
            type: DataTypes.TEXT,
            allowNull: true
          },
          { transaction: t }
        );
      }
      if (!lembrDesc["destinoTipo"]) {
        await queryInterface.addColumn(
          "TicketLembretes",
          "destinoTipo",
          {
            type: DataTypes.STRING(32),
            allowNull: true
          },
          { transaction: t }
        );
      }
      if (!lembrDesc["destinoId"]) {
        await queryInterface.addColumn(
          "TicketLembretes",
          "destinoId",
          {
            type: DataTypes.INTEGER,
            allowNull: true
          },
          { transaction: t }
        );
      }
      if (!lembrDesc["diasAntecedencia"]) {
        await queryInterface.addColumn(
          "TicketLembretes",
          "diasAntecedencia",
          {
            type: DataTypes.INTEGER,
            allowNull: true
          },
          { transaction: t }
        );
      }
      if (!lembrDesc["ultimoDisparoEm"]) {
        await queryInterface.addColumn(
          "TicketLembretes",
          "ultimoDisparoEm",
          {
            type: DataTypes.DATEONLY,
            allowNull: true
          },
          { transaction: t }
        );
      }

      await queryInterface.changeColumn(
        "TicketLembretes",
        "data",
        {
          type: DataTypes.DATEONLY,
          allowNull: true
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        "TicketLembretes",
        "hora",
        {
          type: DataTypes.STRING(20),
          allowNull: true
        },
        { transaction: t }
      );

      if (!quadroDesc["dataPrazo"]) {
        await queryInterface.addColumn(
          "TicketQuadros",
          "dataPrazo",
          {
            type: DataTypes.DATEONLY,
            allowNull: true
          },
          { transaction: t }
        );
      }

      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const t = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("TicketQuadros", "dataPrazo", { transaction: t });
      await queryInterface.changeColumn(
        "TicketLembretes",
        "hora",
        {
          type: DataTypes.STRING(20),
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        "TicketLembretes",
        "data",
        {
          type: DataTypes.DATEONLY,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.removeColumn("TicketLembretes", "ultimoDisparoEm", { transaction: t });
      await queryInterface.removeColumn("TicketLembretes", "diasAntecedencia", { transaction: t });
      await queryInterface.removeColumn("TicketLembretes", "destinoId", { transaction: t });
      await queryInterface.removeColumn("TicketLembretes", "destinoTipo", { transaction: t });
      await queryInterface.removeColumn("TicketLembretes", "mensagemTemplate", { transaction: t });
      await queryInterface.removeColumn("TicketLembretes", "ativo", { transaction: t });
      await queryInterface.removeColumn("TicketLembretes", "tipoGatilho", { transaction: t });
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }
};
