import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "QuadroGroups" })
class QuadroGroup extends Model<QuadroGroup> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  /** JSON: { [laneId: string]: string[] } — ordem dos cards por coluna (ids de ticket ou -quadroId standalone) */
  @AllowNull(true)
  @Column(DataType.TEXT)
  kanbanCardsOrderJson: string;

  /** JSON: number[] — ordem das colunas (tag ids kanban) nesta área */
  @AllowNull(true)
  @Column(DataType.TEXT)
  kanbanColumnOrderJson: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QuadroGroup;
