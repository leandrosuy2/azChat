import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  AllowNull,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "CompanyLifecycleEvents" })
class CompanyLifecycleEvent extends Model<CompanyLifecycleEvent> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column
  eventType: string;

  @Column
  title: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @AllowNull(true)
  @Column
  previousStatus: string;

  @AllowNull(true)
  @Column
  newStatus: string;

  @AllowNull(true)
  @Column(DataType.JSONB)
  metadata: Record<string, unknown>;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CompanyLifecycleEvent;
