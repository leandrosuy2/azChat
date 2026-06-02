import { QueryInterface, DataTypes, Model, ModelAttributeColumnOptions } from "sequelize";

const CATEGORIES = "ProductCategories";
const UNITS = "ProductUnits";
const PRODUCTS = "Products";

type TableColumns = Record<string, unknown>;

const hasColumn = (tableInfo: TableColumns, name: string): boolean =>
  Boolean(tableInfo[name]);

const tableExists = async (
  queryInterface: QueryInterface,
  table: string
): Promise<boolean> => {
  try {
    await queryInterface.describeTable(table);
    return true;
  } catch {
    return false;
  }
};

const addColumnIfMissing = async (
  queryInterface: QueryInterface,
  table: string,
  name: string,
  definition: ModelAttributeColumnOptions<Model>
): Promise<void> => {
  const info = (await queryInterface.describeTable(table)) as TableColumns;
  if (!hasColumn(info, name)) {
    await queryInterface.addColumn(table, name, definition);
  }
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    if (!(await tableExists(queryInterface, CATEGORIES))) {
      await queryInterface.createTable(CATEGORIES, {
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
          type: DataTypes.STRING(120),
          allowNull: false
        },
        parentId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: CATEGORIES, key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
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
      await queryInterface.addIndex(CATEGORIES, ["companyId"], {
        name: "product_categories_company_id_idx"
      });
      await queryInterface.addIndex(CATEGORIES, ["companyId", "parentId"], {
        name: "product_categories_company_parent_idx"
      });
    }

    if (!(await tableExists(queryInterface, UNITS))) {
      await queryInterface.createTable(UNITS, {
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
          type: DataTypes.STRING(80),
          allowNull: false
        },
        abbreviation: {
          type: DataTypes.STRING(20),
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
      });
      await queryInterface.addIndex(UNITS, ["companyId"], {
        name: "product_units_company_id_idx"
      });
    }

    if (await tableExists(queryInterface, PRODUCTS)) {
      await addColumnIfMissing(queryInterface, PRODUCTS, "categoryId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: CATEGORIES, key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });
      await addColumnIfMissing(queryInterface, PRODUCTS, "subcategoryId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: CATEGORIES, key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });
      await addColumnIfMissing(queryInterface, PRODUCTS, "unit", {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: "un"
      });
      await addColumnIfMissing(queryInterface, PRODUCTS, "costPrice", {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      });
      await addColumnIfMissing(queryInterface, PRODUCTS, "imageUrl", {
        type: DataTypes.STRING(500),
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, PRODUCTS, "internalNotes", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    if (await tableExists(queryInterface, PRODUCTS)) {
      for (const col of [
        "categoryId",
        "subcategoryId",
        "unit",
        "costPrice",
        "imageUrl",
        "internalNotes"
      ]) {
        const info = (await queryInterface.describeTable(
          PRODUCTS
        )) as TableColumns;
        if (hasColumn(info, col)) {
          await queryInterface.removeColumn(PRODUCTS, col);
        }
      }
    }
    if (await tableExists(queryInterface, UNITS)) {
      await queryInterface.dropTable(UNITS);
    }
    if (await tableExists(queryInterface, CATEGORIES)) {
      await queryInterface.dropTable(CATEGORIES);
    }
  }
};
