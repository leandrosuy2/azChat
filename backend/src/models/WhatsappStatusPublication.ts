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
  Default,
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import Whatsapp from "./Whatsapp";

@Table({ tableName: "WhatsappStatusPublications" })
class WhatsappStatusPublication extends Model<WhatsappStatusPublication> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @Default("text")
  @Column(DataType.STRING)
  contentType: string;

  @Column(DataType.TEXT)
  body: string;

  @Column(DataType.STRING)
  mediaPath: string;

  @Column(DataType.STRING)
  mediaName: string;

  @Column(DataType.STRING)
  mediaType: string;

  @Default("draft")
  @Column(DataType.STRING)
  status: string;

  @Column(DataType.DATE)
  scheduledAt: Date;

  @Column(DataType.DATE)
  publishedAt: Date;

  @Column(DataType.TEXT)
  failureReason: string;

  @Column(DataType.JSONB)
  audit: any;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default WhatsappStatusPublication;
