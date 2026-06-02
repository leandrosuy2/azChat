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
  Default,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import ProductCategory from "./ProductCategory";

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

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  /** Legado — texto livre; preferir categoryId/subcategoryId. */
  @AllowNull(true)
  @Column
  category: string;

  @ForeignKey(() => ProductCategory)
  @AllowNull(true)
  @Column
  categoryId: number;

  @BelongsTo(() => ProductCategory, "categoryId")
  productCategory: ProductCategory;

  @ForeignKey(() => ProductCategory)
  @AllowNull(true)
  @Column
  subcategoryId: number;

  @BelongsTo(() => ProductCategory, "subcategoryId")
  productSubcategory: ProductCategory;

  @AllowNull(true)
  @Column
  code: string;

  @Default("un")
  @Column
  unit: string;

  @Default(0)
  @Column(DataType.DECIMAL(14, 2))
  price: number;

  @Default(0)
  @Column(DataType.DECIMAL(14, 2))
  costPrice: number;

  @Default("active")
  @Column
  status: string;

  @AllowNull(true)
  @Column
  imageUrl: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  internalNotes: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Product;
