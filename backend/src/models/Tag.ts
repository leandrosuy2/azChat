import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
  HasMany,
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";
import QuadroGroup from "./QuadroGroup";
import Ticket from "./Ticket";
import TicketTag from "./TicketTag";
import Contact from "./Contact";
import ContactTag from "./ContactTag";

@Table
class Tag extends Model<Tag> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  color: string;

  @Column
  kanban: number;

  @HasMany(() => TicketTag)
  ticketTags: TicketTag[];

  @BelongsToMany(() => Ticket, () => TicketTag)
  tickets: Ticket[];

  @BelongsToMany(() => Contact, () => ContactTag)
  contacts: Array<Contact & { ContactTag: ContactTag }>;

  @HasMany(() => ContactTag)
  contactTags: ContactTag[];

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  /** Área de trabalho Kanban à qual esta etapa (coluna) pertence; kanban=1 */
  @ForeignKey(() => QuadroGroup)
  @AllowNull(true)
  @Column
  quadroGroupId: number;

  @BelongsTo(() => QuadroGroup)
  quadroGroup: QuadroGroup;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  timeLane: number;

	@Column
  nextLaneId: number;
	
  @Column
  greetingMessageLane: string;

  @Column
  rollbackLaneId: number;

  /** Ordem na inbox (categorias kanban=0 e etapas do funil kanban=2); null = após os com ordem, tie-break por nome */
  @AllowNull(true)
  @Column
  inboxOrder: number;
}

export default Tag;
