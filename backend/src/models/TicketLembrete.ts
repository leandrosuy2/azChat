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
  Default,
  DataType
} from "sequelize-typescript";
import Ticket from "./Ticket";
import Company from "./Company";
import TicketEvento from "./TicketEvento";

@Table({ tableName: "TicketLembretes" })
class TicketLembrete extends Model<TicketLembrete> {
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

  @Column
  nome: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  descricao: string;

  /** agendado: obrigatório; demais gatilhos: opcional */
  @AllowNull(true)
  @Column(DataType.DATEONLY)
  data: string;

  @AllowNull(true)
  @Column(DataType.STRING(20))
  hora: string;

  @Default(false)
  @Column
  addGoogle: boolean;

  /** agendado | prazo_proximo | prazo_vencido | movimentacao | mudanca_status */
  @Default("agendado")
  @Column(DataType.STRING(32))
  tipoGatilho: string;

  @Default(true)
  @Column
  ativo: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  mensagemTemplate: string;

  /** interno | responsavel | fila | contato_whatsapp */
  @AllowNull(true)
  @Column(DataType.STRING(32))
  destinoTipo: string;

  @AllowNull(true)
  @Column
  destinoId: number;

  @AllowNull(true)
  @Column
  diasAntecedencia: number;

  /** No dia do prazo: dispara X minutos antes do fim do dia (23:59:59). */
  @AllowNull(true)
  @Column
  antecedenciaMinutos: number;

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  ultimoDisparoEm: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  ultimoDisparoAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketLembrete;
