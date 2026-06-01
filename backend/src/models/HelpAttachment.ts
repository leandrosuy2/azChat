import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Help from "./Help";

@Table({
  tableName: "HelpAttachments"
})
class HelpAttachment extends Model<HelpAttachment> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Help)
  @Column
  helpId: number;

  @BelongsTo(() => Help)
  help: Help;

  @Column
  name: string;

  @Column
  path: string;

  @Column
  type: string;

  @Column
  mimetype: string;

  @Column
  size: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default HelpAttachment;
