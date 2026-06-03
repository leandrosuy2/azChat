import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  ForeignKey,
  BelongsTo,
  AllowNull,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import Whatsapp from "./Whatsapp";

@Table({ tableName: "MetaEventLogs" })
class MetaEventLog extends Model<MetaEventLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Whatsapp)
  @AllowNull(true)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @Column(DataType.STRING(32))
  channel: string;

  @Column(DataType.STRING(16))
  direction: string;

  @Column(DataType.STRING(64))
  eventType: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  externalId: string;

  @Default("received")
  @Column(DataType.STRING(32))
  status: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  errorMessage: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  payload: Record<string, unknown>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MetaEventLog;
