import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  AllowNull,
  Default,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import Ticket from "./Ticket";
import Contact from "./Contact";
import User from "./User";

export type BudgetPayloadStored = {
  company: {
    name: string;
    phone: string;
    email: string;
    document: string;
    logoUrl?: string;
  };
  client: {
    name: string;
    doc: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    email: string;
    phone: string;
  };
  sellerName: string;
  notes?: string;
  items: Array<{
    code: string;
    description: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  automation?: { kanbanTagId?: number | null };
  /** Motivo interno quando recusado pelo atendente (opcional). */
  rejectionReason?: string;
};

@Table({ tableName: "TicketBudgets" })
class TicketBudget extends Model<TicketBudget> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Ticket)
  @AllowNull(true)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @AllowNull(true)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column
  publicToken: string;

  @Column
  budgetNumber: string;

  @Default("pending")
  @Column
  status: string;

  @AllowNull(true)
  @Column(DataType.DATEONLY)
  validUntil: string;

  @Column(DataType.JSONB)
  payload: BudgetPayloadStored;

  @AllowNull(true)
  @Column
  signatureSignerName: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  signatureImage: string;

  @AllowNull(true)
  @Column
  signedAt: Date;

  @AllowNull(true)
  @Column
  signerIp: string;

  @AllowNull(true)
  @Column
  rejectedAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketBudget;
