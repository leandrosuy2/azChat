import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Unique,
  Default,
  HasMany,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  DataType
} from "sequelize-typescript";
import ContactCustomField from "./ContactCustomField";
import Ticket from "./Ticket";
import Company from "./Company";
import Schedule from "./Schedule";
import ContactTag from "./ContactTag";
import Tag from "./Tag";
import ContactWallet from "./ContactWallet";
import User from "./User";
import Whatsapp from "./Whatsapp";

@Table
class Contact extends Model<Contact> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @AllowNull(false)
  @Unique
  @Column
  number: string;

  @AllowNull(false)
  @Default("")
  @Column
  email: string;

  @Default("")
  @Column
  profilePicUrl: string;

  @Default(false)
  @Column
  isGroup: boolean;

  @Default(false)
  @Column
  disableBot: boolean;

  @Default(true)
  @Column
  acceptAudioMessage: boolean;

  @Default(true)
  @Column
  active: boolean;

  @Default("whatsapp")
  @Column
  channel: string;

  @Column
  country: string;

  @Column
  city: string;

  @Column
  state: string;

  @Column
  leadOrigin: string;

  @Column(DataType.DATEONLY)
  entryDate: string;

  @Column(DataType.DATEONLY)
  exitDate: string;

  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  dealValue: number;

  @Column
  companyName: string;

  @Column
  position: string;

  @Column(DataType.TEXT)
  productsInterest: string;

  @Column(DataType.TEXT)
  observation: string;

  /** CPF ou CNPJ (apenas dígitos, 11 ou 14 caracteres) */
  @AllowNull(true)
  @Column
  document: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @HasMany(() => ContactCustomField)
  extraInfo: ContactCustomField[];

  @HasMany(() => ContactTag)
  contactTags: ContactTag[];

  @BelongsToMany(() => Tag, () => ContactTag)
  tags: Tag[];

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => Schedule, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
    hooks: true
  })
  schedules: Schedule[];

  @Column
  remoteJid: string;

  @Column
  lgpdAcceptedAt: Date;

  @Column
  pictureUpdated: boolean;

  @Column
  get urlPicture(): string | null {
    if (this.getDataValue("urlPicture")) {
      if (this.getDataValue("urlPicture") === "nopicture.png") {
        return `${process.env.FRONTEND_URL}/nopicture.png`;
      }
      const base = (process.env.BACKEND_URL || "").replace(/\/$/, "");
      let origin = base;
      if (base && process.env.PROXY_PORT) {
        const hasPort = /:\d{2,5}(\/|$)/.test(base);
        if (!hasPort) origin = `${base}:${process.env.PROXY_PORT}`;
      }
      return `${origin}/public/company${this.companyId}/contacts/${this.getDataValue("urlPicture")}`;
    }
    return null;
  }

  @BelongsToMany(() => User, () => ContactWallet, "contactId", "walletId")
  wallets: ContactWallet[];

  @HasMany(() => ContactWallet)
  contactWallets: ContactWallet[];

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;
}

export default Contact;
