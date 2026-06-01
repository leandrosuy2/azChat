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
  Default,
  DataType
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "Products" })
class Product extends Model<Product> {
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
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @Column
  category: string;

  @Column
  code: string;

  @Default(0)
  @Column(DataType.DECIMAL(14, 2))
  price: number;

  @Default("active")
  @Column
  status: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Product;
