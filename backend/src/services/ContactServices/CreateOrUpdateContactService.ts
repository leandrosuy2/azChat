import { getIO } from "../../libs/socket";
import CompaniesSettings from "../../models/CompaniesSettings";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import ContactListItem from "../../models/ContactListItem";
import fs from "fs";
import path, { join } from "path";
import logger from "../../utils/logger";
import { isNil, isEmpty } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import * as Sentry from "@sentry/node";
import moment from "moment";
import { Op } from "sequelize";
import { jidNormalizedUser } from "@whiskeysockets/baileys";

const axios = require('axios');

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  companyId: number;
  channel?: string;
  extraInfo?: ExtraInfo[];
  remoteJid?: string;
  whatsappId?: number;
  wbot?: any;
}

// Função para validar se o nome é válido
const isValidName = (name: string): boolean => {
  // Remove espaços em branco
  const cleanName = name ? name.trim() : "";

  // Verifica se o nome não é apenas números ou vazio
  if (isEmpty(cleanName) || /^\d+$/.test(cleanName)) {
    return false;
  }

  // Verifica se o nome tem pelo menos 2 caracteres após remover espaços
  return cleanName.length >= 2;
};

const downloadProfileImage = async ({
  profilePicUrl,
  companyId,
  contact
}) => {
  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  let filename;

  const folder = path.resolve(publicFolder, `company${companyId}`, "contacts");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    fs.chmodSync(folder, 0o777);
  }

  if (!profilePicUrl) return filename;

  try {
    const response = await axios.get(profilePicUrl, {
      responseType: 'arraybuffer'
    });

    filename = `${new Date().getTime()}.jpeg`;
    fs.writeFileSync(join(folder, filename), response.data);

  } catch (error) {
    console.error(error)
  }

  return filename
}

/**
 * WhatsApp grava @lid no chat; o número exibido deve ser o PN (@s.whatsapp.net) quando o Baileys já mapeou.
 */
const resolveNumberAndJidForStorage = async (
  isGroup: boolean,
  rawNumber: string,
  remoteJid: string,
  wbot: any
): Promise<{ number: string; storeRemoteJid: string; rawDigits: string }> => {
  const rawDigits = isGroup
    ? String(rawNumber || "")
    : String(rawNumber || "").replace(/[^0-9]/g, "");
  let storeRemoteJid = String(remoteJid || "").trim();
  let number = rawDigits;

  if (
    !isGroup &&
    storeRemoteJid.includes("@lid") &&
    wbot?.signalRepository?.lidMapping?.getPNForLID
  ) {
    try {
      const pnJid = await wbot.signalRepository.lidMapping.getPNForLID(
        jidNormalizedUser(storeRemoteJid)
      );
      if (pnJid && String(pnJid).includes("@")) {
        const pnNorm = jidNormalizedUser(String(pnJid));
        storeRemoteJid = pnNorm;
        number = pnNorm.split("@")[0].replace(/\D/g, "");
      }
    } catch (e) {
      logger.warn(`LID→PN indisponível (${storeRemoteJid})`, e);
    }
  }

  // LID não resolvido: salvar number vazio em vez do ID interno do WhatsApp
  if (!isGroup && storeRemoteJid.includes("@lid") && number === rawDigits) {
    number = "";
  }

  return { number, storeRemoteJid, rawDigits };
};

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  channel = "whatsapp",
  companyId,
  extraInfo = [],
  remoteJid = "",
  whatsappId,
  wbot
}: Request): Promise<Contact> => {
  try {
    let createContact = false;
    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const { number, storeRemoteJid, rawDigits } = await resolveNumberAndJidForStorage(
      isGroup,
      rawNumber,
      remoteJid,
      wbot
    );
    const io = getIO();
    let contact: Contact | null;

    // Busca o nome na lista de contatos se o nome atual for inválido
    let contactListItem =
      (await ContactListItem.findOne({
        where: { number, companyId }
      })) ||
      (await ContactListItem.findOne({
        where: { number: rawNumber, companyId }
      }));

    // Determina o nome a ser usado inicialmente
    let contactName = name;
    if (!isValidName(name)) {
      contactName = contactListItem?.name;
      if (!isValidName(String(contactName || "")) && wbot && ["whatsapp"].includes(channel)) {
        try {
          // Baileys 7+ não expõe getContactById no WASocket; Contact usa `notify` (push name), não `pushname`.
          let wbotContact: any = null;
          if (typeof (wbot as any).getContactById === "function") {
            wbotContact = await (wbot as any).getContactById(remoteJid);
          }
          const fromWa =
            wbotContact?.name ||
            wbotContact?.notify ||
            wbotContact?.verifiedName ||
            wbotContact?.pushname;
          if (fromWa) contactName = String(fromWa);
        } catch (e) {
          logger.error("Erro ao buscar nome via wbot:", e);
        }
      }
      // Nunca usar o próprio número/LID como nome (gera lista ilegível na UI).
      if (!isValidName(String(contactName || ""))) {
        contactName = "";
      }
    }

    const findOr: { number?: string; remoteJid?: string }[] = [];
    if (number) findOr.push({ number });
    if (!isGroup && rawDigits && rawDigits !== number) {
      findOr.push({ number: rawDigits });
    }
    if (remoteJid && String(remoteJid).includes("@")) {
      findOr.push({ remoteJid: jidNormalizedUser(String(remoteJid)) });
    }
    if (
      storeRemoteJid &&
      String(storeRemoteJid).includes("@") &&
      storeRemoteJid !== remoteJid
    ) {
      findOr.push({ remoteJid: jidNormalizedUser(String(storeRemoteJid)) });
    }

    contact = findOr.length
      ? await Contact.findOne({
          where: { companyId, [Op.or]: findOr }
        })
      : null;

    let updateImage =
      typeof profilePicUrl !== "undefined" &&
      Boolean(wbot) &&
      (!contact || (contact?.profilePicUrl !== profilePicUrl && profilePicUrl !== ""));

    if (contact) {
      // Atualização de contato existente
      if (storeRemoteJid) {
        contact.remoteJid = jidNormalizedUser(storeRemoteJid);
      }
      if (!isGroup && number && contact.number !== number) {
        const conflict = await Contact.findOne({
          where: {
            number,
            companyId,
            id: { [Op.ne]: contact.id }
          }
        });
        if (conflict) {
          logger.warn(
            `Skip number update on contact ${contact.id}: number ${number} already used by contact ${conflict.id} (companyId=${companyId})`
          );
        } else {
          contact.number = number;
        }
      }
      // Limpa número LID que já estava salvo no banco
      if (!isGroup && !number && rawDigits && contact.number === rawDigits) {
        contact.number = "";
      }
      if (typeof profilePicUrl !== "undefined") {
        contact.profilePicUrl = profilePicUrl || null;
      }
      contact.isGroup = isGroup;

      // Atualiza o nome apenas se o nome atual for inválido
      if (!isValidName(contact.name)) {
        contact.name = contactName;
      }

      if (isNil(contact.whatsappId)) {
        const whatsapp = await Whatsapp.findOne({
          where: { id: whatsappId, companyId }
        });
        if (whatsapp) {
          contact.whatsappId = whatsappId;
        }
      }

      const folder = path.resolve(publicFolder, `company${companyId}`, "contacts");
      let fileName, oldPath = "";
      if (contact.urlPicture) {
        oldPath = path.resolve(contact.urlPicture.replace(/\\/g, '/'));
        fileName = path.join(folder, oldPath.split('\\').pop());
      }

      if (!fs.existsSync(fileName) || contact.profilePicUrl === "") {
        if (wbot && ['whatsapp'].includes(channel)) {
          try {
            const picJid =
              (storeRemoteJid && storeRemoteJid.includes("@")
                ? storeRemoteJid
                : remoteJid) || remoteJid;
            profilePicUrl = await wbot.profilePictureUrl(picJid, "image");
          } catch (e) {
            Sentry.captureException(e);
            profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
          }
          contact.profilePicUrl = profilePicUrl;
          updateImage = true;
        }
      }

      await contact.save();
      await contact.reload();

    } else if (wbot && ['whatsapp'].includes(channel)) {
      // Criação de novo contato
      const settings = await CompaniesSettings.findOne({ where: { companyId } });
      const acceptAudioMessageContact = settings?.acceptAudioMessageContact;
      let newRemoteJid = storeRemoteJid || remoteJid;

      if (!newRemoteJid) {
        newRemoteJid = isGroup ? `${rawNumber}@g.us` : `${number}@s.whatsapp.net`;
      } else if (!newRemoteJid.includes("@")) {
        newRemoteJid = isGroup
          ? `${rawNumber}@g.us`
          : `${newRemoteJid.replace(/\D/g, "")}@s.whatsapp.net`;
      }
      newRemoteJid = jidNormalizedUser(newRemoteJid);

      try {
        profilePicUrl = await wbot.profilePictureUrl(newRemoteJid, "image");
      } catch (e) {
        Sentry.captureException(e);
        profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
      }

      contact = await Contact.create({
        name: contactName,
        number,
        email,
        isGroup,
        companyId,
        channel,
        acceptAudioMessage: acceptAudioMessageContact === 'enabled' ? true : false,
        remoteJid: newRemoteJid,
        profilePicUrl,
        urlPicture: "",
        whatsappId
      });

      createContact = true;

    } else if (['facebook', 'instagram'].includes(channel)) {
      contact = await Contact.create({
        name: contactName,
        number,
        email,
        isGroup,
        companyId,
        channel,
        profilePicUrl,
        urlPicture: "",
        whatsappId
      });
    }

    // Download de imagem 
    if (updateImage) {
      let filename = await downloadProfileImage({
        profilePicUrl,
        companyId,
        contact
      });

      await contact.update({
        urlPicture: filename,
        pictureUpdated: true
      });

      await contact.reload();
    } else if (['facebook', 'instagram'].includes(channel)) {
      if (profilePicUrl) {
        let filename = await downloadProfileImage({
          profilePicUrl,
          companyId,
          contact
        });

        await contact.update({
          urlPicture: filename,
          pictureUpdated: true
        });
      }

      await contact.reload();
    }

    // Emissão de socket
    if (createContact) {
      io.of(String(companyId))
        .emit(`company-${companyId}-contact`, {
          action: "create",
          contact
        });
    } else {
      io.of(String(companyId))
        .emit(`company-${companyId}-contact`, {
          action: "update",
          contact
        });
    }

    return contact;
  } catch (err) {
    logger.error("Error to find or create a contact:", err);
    throw err;
  }
};

export default CreateOrUpdateContactService;