import AppError from "../../errors/AppError";
import CompaniesSettings from "../../models/CompaniesSettings";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import ContactWallet from "../../models/ContactWallet";
import { jidNormalizedUser } from "@whiskeysockets/baileys";

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}

interface Wallet {
  walletId: number | string;
  contactId: number | string;
  companyId: number | string;
}
interface Request {
  name: string;
  number: string;
  email?: string;
  profilePicUrl?: string;
  acceptAudioMessage?: boolean;
  active?: boolean;
  companyId: number;
  extraInfo?: ExtraInfo[];
  remoteJid?: string;
  wallets?: null | number[] | string[];
  country?: string;
  city?: string;
  state?: string;
  leadOrigin?: string;
  entryDate?: string;
  exitDate?: string;
  dealValue?: number;
  companyName?: string;
  position?: string;
  productsInterest?: string;
  observation?: string;
  document?: string | null;
}

const CreateContactService = async ({
  name,
  number,
  email = "",
  acceptAudioMessage,
  active,
  companyId,
  extraInfo = [],
  remoteJid = "",
  wallets,
  country,
  city,
  state,
  leadOrigin,
  entryDate,
  exitDate,
  dealValue,
  companyName,
  position,
  productsInterest,
  observation,
  document
}: Request): Promise<Contact> => {

  const normalizedRemoteJid =
    remoteJid && String(remoteJid).includes("@")
      ? jidNormalizedUser(String(remoteJid))
      : remoteJid;

  const numberExists = number
    ? await Contact.findOne({
        where: { number, companyId }
      })
    : null;
  if (numberExists) {

    throw new AppError("ERR_DUPLICATED_CONTACT");
  }

  if (normalizedRemoteJid) {
    const remoteJidExists = await Contact.findOne({
      where: { remoteJid: normalizedRemoteJid, companyId }
    });
    if (remoteJidExists) {
      throw new AppError("ERR_DUPLICATED_CONTACT");
    }
  }

  const settings = await CompaniesSettings.findOne({
    where: {
      companyId
    }
  })

  const { acceptAudioMessageContact } = settings;

  const contact = await Contact.create(
    {
      name,
      number,
      email,
      acceptAudioMessage: acceptAudioMessageContact === 'enabled' ? true : false,
      active,
      extraInfo,
      companyId,
      remoteJid: normalizedRemoteJid,
      country,
      city,
      state,
      leadOrigin,
      entryDate,
      exitDate,
      dealValue,
      companyName,
      position,
      productsInterest,
      observation,
      document: document === "" || document === undefined ? null : document
    },
    {
      include: ["extraInfo",
        {
          association: "wallets",
          attributes: ["id", "name"]
        }]
    }
  );

  if (wallets) {
    await ContactWallet.destroy({
      where: {
        companyId,
        contactId: contact.id
      }
    });

    const contactWallets: Wallet[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wallets.forEach((wallet: any) => {
      contactWallets.push({
        walletId: !wallet.id ? wallet : wallet.id,
        contactId: contact.id,
        companyId
      });
    });

    await ContactWallet.bulkCreate(contactWallets);
  }
  return contact;

};

export default CreateContactService;
