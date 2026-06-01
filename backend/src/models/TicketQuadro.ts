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
  DataType,
  AllowNull,
  HasMany,
  DefaultScope
} from "sequelize-typescript";
import Ticket from "./Ticket";
import QuadroGroup from "./QuadroGroup";
import Company from "./Company";
import Contact from "./Contact";
import Tag from "./Tag";
import TicketQuadroAnexo from "./TicketQuadroAnexo";
import type { ProcessoDetalheItem } from "../helpers/ProcessoDetalhesItens";

/** Exclui coluna opcional (migration) do SELECT padrão — evita Kanban vazio se o banco ainda não foi migrado. */
@DefaultScope(() => ({
  attributes: {
    exclude: ["unlinkedMirrorDataByGroup"]
  }
}))
@Table({ tableName: "TicketQuadros" })
class TicketQuadro extends Model<TicketQuadro> {
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

  @Column({ type: DataType.STRING(36), allowNull: false })
  uuid: string;

  @ForeignKey(() => Contact)
  @AllowNull(true)
  @Column
  linkedContactId: number;

  @BelongsTo(() => Contact, { foreignKey: "linkedContactId", as: "linkedContact" })
  linkedContact: Contact;

  @ForeignKey(() => Tag)
  @AllowNull(true)
  @Column
  kanbanTagId: number;

  @BelongsTo(() => Tag, { foreignKey: "kanbanTagId", as: "kanbanTag" })
  kanbanTag: Tag;

  @Default("aguardando")
  @Column
  status: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description: string;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  valorServico: number;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  valorEntrada: number;

  @AllowNull(true)
  @Column
  nomeProjeto: string;

  /** Prazo do card (Kanban) para lembretes inteligentes de prazo. */
  @AllowNull(true)
  @Column(DataType.DATEONLY)
  dataPrazo: string;

  /** Texto longo legado (opcional); preferir detalhesProcessoItens. */
  @Column({ type: DataType.TEXT, allowNull: true })
  detalhesProcesso: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  get detalhesProcessoItens(): ProcessoDetalheItem[] {
    const raw = this.getDataValue("detalhesProcessoItens" as any);
    if (!raw) return [];
    if (typeof raw === "string") {
      try {
        const p = JSON.parse(raw);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(raw) ? raw : [];
  }
  set detalhesProcessoItens(val: ProcessoDetalheItem[] | null) {
    this.setDataValue(
      "detalhesProcessoItens" as any,
      val && val.length ? JSON.stringify(val) : null
    );
  }

  @Column({ type: DataType.TEXT, allowNull: true })
  get customFields(): any {
    const raw = this.getDataValue("customFields" as any);
    if (!raw) return [];
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return raw;
  }
  set customFields(val: any) {
    this.setDataValue("customFields" as any, val ? JSON.stringify(val) : null);
  }

  @ForeignKey(() => QuadroGroup)
  @AllowNull(true)
  @Column
  quadroGroupId: number;

  @BelongsTo(() => QuadroGroup)
  group: QuadroGroup;

  @Column({ type: DataType.TEXT, allowNull: true })
  get sharedGroupIds(): number[] {
    const raw = this.getDataValue("sharedGroupIds" as any);
    if (!raw) return [];
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return raw as number[];
  }
  set sharedGroupIds(val: number[]) {
    this.setDataValue("sharedGroupIds" as any, val ? JSON.stringify(val) : null);
  }

  @Default("linked")
  @Column({ type: DataType.STRING(20), allowNull: true })
  linkType: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  get sharedStagesByGroup(): Record<string, number[]> {
    const raw = this.getDataValue("sharedStagesByGroup" as any);
    if (!raw) return {};
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw as Record<string, number[]>;
  }
  set sharedStagesByGroup(val: Record<string, number[]>) {
    this.setDataValue("sharedStagesByGroup" as any, val && Object.keys(val).length ? JSON.stringify(val) : null);
  }

  /** Por área (id do QuadroGroup): cópia local dos dados do quadro quando linkType = unlinked no espelho. */
  @Column({ type: DataType.TEXT, allowNull: true })
  get unlinkedMirrorDataByGroup(): Record<string, Record<string, unknown>> {
    const raw = this.getDataValue("unlinkedMirrorDataByGroup" as any);
    if (!raw) return {};
    if (typeof raw === "string") {
      try {
        const p = JSON.parse(raw);
        return p && typeof p === "object" && !Array.isArray(p) ? p : {};
      } catch {
        return {};
      }
    }
    return raw as Record<string, Record<string, unknown>>;
  }
  set unlinkedMirrorDataByGroup(val: Record<string, Record<string, unknown>> | null) {
    this.setDataValue(
      "unlinkedMirrorDataByGroup" as any,
      val && Object.keys(val).length ? JSON.stringify(val) : null
    );
  }

  @ForeignKey(() => Company)
  @AllowNull(true)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => TicketQuadroAnexo, { foreignKey: "ticketId", sourceKey: "ticketId" })
  attachments: TicketQuadroAnexo[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketQuadro;
