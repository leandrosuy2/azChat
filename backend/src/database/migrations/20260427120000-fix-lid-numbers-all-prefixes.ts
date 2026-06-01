import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // A migration anterior (20260426) só limpava LIDs cujo number começava com '1'.
    // Na prática os LIDs chegam com qualquer prefixo (2, 3, 5, 6...).
    // A fonte da verdade é o remoteJid terminar em @lid — não o formato do número.
    await queryInterface.sequelize.query(`
      UPDATE "Contacts"
      SET number = ''
      WHERE "remoteJid" LIKE '%@lid'
        AND number != ''
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    // Não tem como reverter: os números originais foram perdidos intencionalmente.
  },
};
