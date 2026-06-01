import {
  Table,
  Column,
  CreatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AutoIncrement,
  AllowNull,
  Default,
  DataType
} from "sequelize-typescript";
import TicketLembrete from "./TicketLembrete";
import Ticket from "./Ticket";
import Company from "./Company";

@Table({ tableName: "TicketLembreteDisparos", updatedAt: false })
class TicketLembreteDisparo extends Model<TicketLembreteDisparo> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => TicketLembrete)
  @Column
  lembreteId: number;

  @BelongsTo(() => TicketLembrete)
  lembrete: TicketLembrete;

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

  @Column(DataType.STRING(40))
  tipoGatilho: string;

  /** ok | ok_interno | erro */
  @Column(DataType.STRING(24))
  status: string;

  @Default(true)
  @Column
  canalInterno: boolean;

  @Default(false)
  @Column
  canalWhatsapp: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  corpo: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  erroWhatsapp: string;

  @CreatedAt
  createdAt: Date;
}

export default TicketLembreteDisparo;
