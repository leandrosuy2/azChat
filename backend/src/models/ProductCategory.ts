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
  HasMany,
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "ProductCategories" })
class ProductCategory extends Model<ProductCategory> {
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

  @ForeignKey(() => ProductCategory)
  @AllowNull(true)
  @Column
  parentId: number;

  @BelongsTo(() => ProductCategory, "parentId")
  parent: ProductCategory;

  @HasMany(() => ProductCategory, "parentId")
  children: ProductCategory[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ProductCategory;
