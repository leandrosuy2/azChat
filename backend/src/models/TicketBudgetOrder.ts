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
import TicketBudget from "./TicketBudget";
import Ticket from "./Ticket";
import Contact from "./Contact";

@Table({ tableName: "TicketBudgetOrders" })
class TicketBudgetOrder extends Model<TicketBudgetOrder> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => TicketBudget)
  @Column
  budgetId: number;

  @BelongsTo(() => TicketBudget)
  budget: TicketBudget;

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

  @Column
  orderNumber: string;

  @Default(0)
  @Column(DataType.DECIMAL(14, 2))
  total: number;

  @Column(DataType.JSONB)
  items: unknown[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TicketBudgetOrder;
