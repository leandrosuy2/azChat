import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  HasMany
} from "sequelize-typescript";
import HelpAttachment from "./HelpAttachment";

@Table({
  tableName: "Helps"
})
class Help extends Model<Help> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  title: string;

  @Column
  description: string;

  @Column(DataType.TEXT)
  content: string;

  @Column
  areaKey: string;

  @Column
  video: string;

  @Column
  link: string;

  @HasMany(() => HelpAttachment)
  attachments: HelpAttachment[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Help;
