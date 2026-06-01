import { QueryInterface, DataTypes } from "sequelize";

const TABLE = "Products";

type TableColumns = Record<string, unknown>;

const hasColumn = (tableInfo: TableColumns, name: string): boolean =>
  Boolean(tableInfo[name]);

const tableExists = async (queryInterface: QueryInterface): Promise<boolean> => {
  try {
    await queryInterface.describeTable(TABLE);
    return true;
  } catch {
    return false;
  }
};

const addIndexSafe = async (
  queryInterface: QueryInterface,
  fields: string[]
): Promise<void> => {
  try {
    await queryInterface.addIndex(TABLE, fields);
  } catch {
    /* índice já existe ou coluna indisponível */
  }
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const exists = await tableExists(queryInterface);

    if (!exists) {
      await queryInterface.createTable(TABLE, {
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
        name: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        category: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        code: {
          type: DataTypes.STRING(80),
          allowNull: true
        },
        price: {
          type: DataTypes.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "active"
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
      });
    } else {
      const tableInfo = (await queryInterface.describeTable(
        TABLE
      )) as TableColumns;

      if (!hasColumn(tableInfo, "companyId")) {
        await queryInterface.addColumn(TABLE, "companyId", {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        });
      }
      if (!hasColumn(tableInfo, "name")) {
        await queryInterface.addColumn(TABLE, "name", {
          type: DataTypes.STRING(255),
          allowNull: false,
          defaultValue: ""
        });
      }
      if (!hasColumn(tableInfo, "description")) {
        await queryInterface.addColumn(TABLE, "description", {
          type: DataTypes.TEXT,
          allowNull: true
        });
      }
      if (!hasColumn(tableInfo, "category")) {
        await queryInterface.addColumn(TABLE, "category", {
          type: DataTypes.STRING(120),
          allowNull: true
        });
      }
      if (!hasColumn(tableInfo, "code")) {
        await queryInterface.addColumn(TABLE, "code", {
          type: DataTypes.STRING(80),
          allowNull: true
        });
      }
      if (!hasColumn(tableInfo, "price")) {
        await queryInterface.addColumn(TABLE, "price", {
          type: DataTypes.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0
        });
      }
      if (!hasColumn(tableInfo, "status")) {
        await queryInterface.addColumn(TABLE, "status", {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "active"
        });
      }
      if (!hasColumn(tableInfo, "createdAt")) {
        await queryInterface.addColumn(TABLE, "createdAt", {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        });
      }
      if (!hasColumn(tableInfo, "updatedAt")) {
        await queryInterface.addColumn(TABLE, "updatedAt", {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        });
      }
    }

    const finalInfo = (await queryInterface.describeTable(
      TABLE
    )) as TableColumns;

    if (hasColumn(finalInfo, "companyId")) {
      await addIndexSafe(queryInterface, ["companyId"]);
    }
    if (hasColumn(finalInfo, "companyId") && hasColumn(finalInfo, "status")) {
      await addIndexSafe(queryInterface, ["companyId", "status"]);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    if (await tableExists(queryInterface)) {
      await queryInterface.dropTable(TABLE);
    }
  }
};
