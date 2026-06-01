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
  Default,
  AllowNull,
  DataType
} from "sequelize-typescript";
import Ticket from "./Ticket";
import TicketQuadro from "./TicketQuadro";
import Company from "./Company";

@Table({ tableName: "TicketQuadroAnexos" })
class TicketQuadroAnexo extends Model<TicketQuadroAnexo> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Ticket)
  @AllowNull(true)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  /** Quadro livre (sem ticket): anexo ligado à linha TicketQuadros. */
  @ForeignKey(() => TicketQuadro)
  @AllowNull(true)
  @Column
  ticketQuadroId: number;

  @BelongsTo(() => TicketQuadro)
  quadro: TicketQuadro;

  @Column
  name: string;

  @Column
  path: string;

  @Default(false)
  @Column
  isCapa: boolean;

  /** UUID do item em detalhesProcessoItens (bloco de etapa); null = anexo geral do cartão. */
  @AllowNull(true)
  @Column(DataType.STRING(36))
  processoBlocoId: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  legenda: string | null;

  @ForeignKey(() => Company)
  @AllowNull(true)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketQuadroAnexo;
