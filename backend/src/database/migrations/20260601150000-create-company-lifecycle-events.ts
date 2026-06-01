import { QueryInterface, DataTypes } from "sequelize";

const TABLE = "CompanyLifecycleEvents";

const tableExists = async (queryInterface: QueryInterface): Promise<boolean> => {
  try {
    await queryInterface.describeTable(TABLE);
    return true;
  } catch {
    return false;
  }
};

const existingIndexNames = async (
  queryInterface: QueryInterface
): Promise<Set<string>> => {
  try {
    const rows = (await queryInterface.showIndex(TABLE)) as Array<{
      name?: string;
    }>;
    return new Set(
      rows.map((r) => String(r.name || "").toLowerCase()).filter(Boolean)
    );
  } catch {
    return new Set();
  }
};

const ensureIndex = async (
  queryInterface: QueryInterface,
  fields: string[],
  name: string
): Promise<void> => {
  const names = await existingIndexNames(queryInterface);
  if (names.has(name.toLowerCase())) return;
  try {
    await queryInterface.addIndex(TABLE, fields, { name });
  } catch (err: unknown) {
    const msg = String((err as Error)?.message || err || "").toLowerCase();
    if (msg.includes("already exists") || msg.includes("duplicate")) return;
    throw err;
  }
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    if (!(await tableExists(queryInterface))) {
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
        eventType: {
          type: DataTypes.STRING(64),
          allowNull: false
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "Users", key: "id" },
          onUpdate: "SET NULL",
          onDelete: "SET NULL"
        },
        previousStatus: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        newStatus: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        metadata: {
          type: DataTypes.JSONB,
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
    }

    await ensureIndex(queryInterface, ["companyId"], "company_lifecycle_events_company_id");
    await ensureIndex(
      queryInterface,
      ["companyId", "createdAt"],
      "company_lifecycle_events_company_id_created_at"
    );
    await ensureIndex(queryInterface, ["eventType"], "company_lifecycle_events_event_type");
  },

  down: async (queryInterface: QueryInterface) => {
    if (await tableExists(queryInterface)) {
      await queryInterface.dropTable(TABLE);
    }
  }
};
