import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import QuadroGroup from "./QuadroGroup";

@Table({ tableName: "QuadroStatuses" })
class QuadroStatus extends Model<QuadroStatus> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  label: string;

  @AllowNull(false)
  @Column
  value: string;

  @AllowNull(false)
  @Default("#9e9e9e")
  @Column(DataType.STRING(9))
  color: string;

  @AllowNull(false)
  @Default(0)
  @Column
  sortOrder: number;

  @ForeignKey(() => QuadroGroup)
  @AllowNull(false)
  @Column
  quadroGroupId: number;

  @BelongsTo(() => QuadroGroup)
  quadroGroup: QuadroGroup;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QuadroStatus;
