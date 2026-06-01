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
  AllowNull
} from "sequelize-typescript";
import Ticket from "./Ticket";
import Company from "./Company";

@Table({ tableName: "TicketEventos" })
class TicketEvento extends Model<TicketEvento> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column
  setor: string;

  @AllowNull(true)
  @Column
  responsavel: string;

  @Column
  tipo: string;

  @Column
  data: string;

  @Column
  hora: string;

  @AllowNull(true)
  @Column
  localizacao: string;

  @AllowNull(true)
  @Column({ type: "TEXT" })
  descricao: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketEvento;
