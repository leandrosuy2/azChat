import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AutoIncrement,
  DataType
} from "sequelize-typescript";

import Company from "./Company";
import User from "./User";

@Table
class QuickMessage extends Model<QuickMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  shortcode: string;

  @Column
  message: string;

  @Column
  get mediaPath(): string | null {
    if (this.getDataValue("mediaPath")) {
      
      return `${process.env.BACKEND_URL}${process.env.PROXY_PORT ?`:${process.env.PROXY_PORT}`:""}/public/company${this.companyId}/quickMessage/${this.getDataValue("mediaPath")}`;

    }
    return null;
  }
  
  @Column
  mediaName: string;

  /** JSON: [{ "path": "arquivo.ext", "name": "nome original.ext" }, ...] — vários anexos (sequência). */
  @Column(DataType.TEXT)
  attachments: string | null;

  @Column
  geral: boolean;
  
  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => Company)
  company: Company;

  @BelongsTo(() => User)
  user: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  visao: boolean;

  @Column
  category: string;

  @Column
  categoryColor: string;

  @Column
  useCount: number;

  @Column
  isFavorite: boolean;

  /** Se true, o clique na resposta rápida envia direto; se false, só preenche o campo de mensagem. */
  @Column
  autoSend: boolean;

  /** Se false, não aparece na lista do chat (atalho / e painel). */
  @Column
  useInSlash: boolean;
}

export default QuickMessage;
