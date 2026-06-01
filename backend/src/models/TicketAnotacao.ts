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
  AllowNull,
  Default
} from "sequelize-typescript";
import Ticket from "./Ticket";
import Company from "./Company";
import TicketEvento from "./TicketEvento";

@Table({ tableName: "TicketAnotacoes" })
class TicketAnotacao extends Model<TicketAnotacao> {
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

  @ForeignKey(() => TicketEvento)
  @AllowNull(true)
  @Column
  eventoId: number;

  @BelongsTo(() => TicketEvento)
  evento: TicketEvento;

  @Column({ type: "TEXT" })
  texto: string;

  @AllowNull(true)
  @Column
  arquivoNome: string;

  @AllowNull(true)
  @Column
  arquivoPath: string;

  @Default("aberta")
  @Column
  status: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketAnotacao;
