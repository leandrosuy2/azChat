import * as Sentry from "@sentry/node";
import { Op } from "sequelize";
import { jidNormalizedUser } from "@whiskeysockets/baileys";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";
import ShowBaileysService from "../BaileysServices/ShowBaileysService";
import CreateContactService from "../ContactServices/CreateContactService";
import { isString, isArray } from "lodash";
import path from "path";
import fs from "fs";

/** Nome na agenda (name); push name em notify. Ignorar só-dígitos (LID). */
const pickNameFromSyncedRow = (row: {
  name?: string;
  notify?: string;
  verifiedName?: string;
}): string => {
  for (const c of [row.notify, row.verifiedName, row.name]) {
    if (c == null) continue;
    const t = String(c).trim();
    if (t.length < 2) continue;
    if (/^\d+$/.test(t.replace(/\s/g, ""))) continue;
    return t;
  }
  return "";
};

const digitsFromJid = (jid: string): string => {
  const user = String(jid || "").split("@")[0] || "";
  return user.replace(/\D/g, "");
};

const normJidSafe = (jid: string): string => {
  try {
    return jidNormalizedUser(String(jid || "").trim());
  } catch {
    return String(jid || "").trim();
  }
};

/**
 * O backup Baileys mistura linhas: histórico com `phoneNumber` (PN) + `lid`, e depois só `id` @lid com `notify`.
 * Cruzamos tudo para achar o PN real antes de cair nos dígitos internos do LID (que não são telefone).
 */
const buildLidToPnMapFromRows = (
  rows: { id?: string; lid?: string; phoneNumber?: string }[]
): Map<string, string> => {
  const m = new Map<string, string>();
  for (const row of rows) {
    const pnRaw = row?.phoneNumber ? String(row.phoneNumber).trim() : "";
    if (!pnRaw.includes("@s.whatsapp.net")) continue;
    let pnNorm = "";
    try {
      pnNorm = jidNormalizedUser(pnRaw);
    } catch {
      continue;
    }
    if (row.lid && String(row.lid).includes("@lid")) {
      m.set(normJidSafe(String(row.lid)), pnNorm);
    }
    if (row.id && String(row.id).includes("@lid")) {
      m.set(normJidSafe(String(row.id)), pnNorm);
    }
  }
  for (const row of rows) {
    const idRaw = row?.id ? String(row.id).trim() : "";
    if (!idRaw.includes("@s.whatsapp.net")) continue;
    let pnNorm = "";
    try {
      pnNorm = jidNormalizedUser(idRaw);
    } catch {
      continue;
    }
    if (row.lid && String(row.lid).includes("@lid")) {
      m.set(normJidSafe(String(row.lid)), pnNorm);
    }
  }
  return m;
};

/**
 * Na importação o `id` do JSON costuma ser @lid; o número real vem de `phoneNumber`, do mapa cruzado no JSON
 * ou de `getPNForLID` no socket. Sem PN resolvido, não gravamos o “número” do LID como telefone.
 */
const resolveImportRowToNumberAndJid = async (
  wbot: any,
  row: { id?: string; phoneNumber?: string; lid?: string },
  lidToPn: Map<string, string>
): Promise<{ number: string; remoteJid: string; sourceJid: string }> => {
  const id = String(row?.id || "").trim();
  if (!id) {
    return { number: "", remoteJid: "", sourceJid: "" };
  }

  const pnFromRow = row?.phoneNumber ? String(row.phoneNumber).trim() : "";
  if (pnFromRow.includes("@")) {
    try {
      const remoteJid = jidNormalizedUser(pnFromRow);
      return {
        number: digitsFromJid(remoteJid),
        remoteJid,
        sourceJid: id,
      };
    } catch {
      /* continua */
    }
  }

  const lidKeys: string[] = [];
  if (id.includes("@lid")) lidKeys.push(normJidSafe(id));
  if (row.lid && String(row.lid).includes("@lid")) {
    const k = normJidSafe(String(row.lid));
    if (!lidKeys.includes(k)) lidKeys.push(k);
  }
  for (const k of lidKeys) {
    const mapped = lidToPn.get(k);
    if (mapped && mapped.includes("@s.whatsapp.net")) {
      try {
        const remoteJid = jidNormalizedUser(mapped);
        return {
          number: digitsFromJid(remoteJid),
          remoteJid,
          sourceJid: id,
        };
      } catch {
        /* continua */
      }
    }
  }

  if (!id.includes("@")) {
    const number = id.replace(/\D/g, "");
    return {
      number,
      remoteJid: number ? `${number}@s.whatsapp.net` : "",
      sourceJid: id,
    };
  }

  let remoteJid = "";
  try {
    remoteJid = jidNormalizedUser(id);
  } catch {
    remoteJid = id;
  }

  if (id.includes("@lid") && wbot?.signalRepository?.lidMapping?.getPNForLID) {
    try {
      const pnJid = await wbot.signalRepository.lidMapping.getPNForLID(remoteJid);
      if (pnJid && String(pnJid).includes("@")) {
        const pnNorm = jidNormalizedUser(String(pnJid));
        return {
          number: digitsFromJid(pnNorm),
          remoteJid: pnNorm,
          sourceJid: id,
        };
      }
    } catch {
      /* sem mapeamento ainda */
    }
  }

  if (String(remoteJid).includes("@lid") || id.includes("@lid")) {
    return { number: "", remoteJid: "", sourceJid: id };
  }

  const number = digitsFromJid(remoteJid) || id.replace(/\D/g, "");
  return {
    number,
    remoteJid: remoteJid || (number ? `${number}@s.whatsapp.net` : ""),
    sourceJid: id,
  };
};

const ImportContactsService = async (
  companyId: number,
  whatsappId?: number
): Promise<void> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(whatsappId, companyId);
  const wbot = getWbot(defaultWhatsapp.id);

  let phoneContacts;

  try {
    const contactsString = await ShowBaileysService(wbot.id);
    phoneContacts = JSON.parse(JSON.stringify(contactsString.contacts));

    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const beforeFilePath = path.join(
      publicFolder,
      `company${companyId}`,
      "contatos_antes.txt"
    );
    fs.writeFile(beforeFilePath, JSON.stringify(phoneContacts, null, 2), err => {
      if (err) {
        logger.error(`Failed to write contacts to file: ${err}`);
        throw err;
      }
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Could not get whatsapp contacts from phone. Err: ${err}`);
  }

  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const afterFilePath = path.join(
    publicFolder,
    `company${companyId}`,
    "contatos_depois.txt"
  );
  fs.writeFile(afterFilePath, JSON.stringify(phoneContacts, null, 2), err => {
    if (err) {
      logger.error(`Failed to write contacts to file: ${err}`);
      throw err;
    }
  });

  const phoneContactsList = isString(phoneContacts)
    ? JSON.parse(phoneContacts)
    : phoneContacts;

  if (isArray(phoneContactsList)) {
    const lidToPn = buildLidToPnMapFromRows(phoneContactsList);

    for (const row of phoneContactsList) {
      const id = row?.id;
      if (!id || id === "status@broadcast" || String(id).includes("g.us")) {
        continue;
      }

      const { number, remoteJid, sourceJid } = await resolveImportRowToNumberAndJid(
        wbot,
        row,
        lidToPn
      );
      if (!number) {
        logger.warn(
          `Import: ignorando entrada sem número PN resolvido (${String(id)}). ` +
            "Comum com só @lid + push name no backup; aguarde sincronizar ou fale com o contato para mapear LID→PN."
        );
        continue;
      }

      const displayName = pickNameFromSyncedRow(row);
      let sourceNorm = "";
      try {
        sourceNorm = sourceJid.includes("@")
          ? jidNormalizedUser(sourceJid)
          : "";
      } catch {
        sourceNorm = sourceJid;
      }
      const lidDigits =
        String(sourceJid).includes("@lid") || String(id).includes("@lid")
          ? String(id).replace(/\D/g, "")
          : "";

      const findOr: { number?: string; remoteJid?: string }[] = [
        { number },
        ...(lidDigits && lidDigits !== number ? [{ number: lidDigits }] : []),
        ...(sourceNorm ? [{ remoteJid: sourceNorm }] : []),
        ...(remoteJid && remoteJid !== sourceNorm ? [{ remoteJid }] : []),
      ].filter(
        f =>
          (typeof f.number === "string" && f.number.length > 0) ||
          (typeof f.remoteJid === "string" && f.remoteJid.length > 0)
      );

      try {
        const existingContact = await Contact.findOne({
          where: { companyId, [Op.or]: findOr },
        });

        if (existingContact) {
          let changed = false;
          if (displayName && displayName !== existingContact.name) {
            existingContact.name = displayName;
            changed = true;
          }
          if (number && existingContact.number !== number) {
            existingContact.number = number;
            changed = true;
          }
          if (remoteJid && existingContact.remoteJid !== remoteJid) {
            existingContact.remoteJid = remoteJid;
            changed = true;
          }
          if (changed) {
            await existingContact.save();
          }
        } else {
          await CreateContactService({
            number,
            name: displayName,
            remoteJid: remoteJid || "",
            companyId,
          });
        }
      } catch (error) {
        Sentry.captureException(error);
        logger.warn(
          `Import contato ${id}: ${error instanceof Error ? error.message : error}`
        );
      }
    }
  }
};

export default ImportContactsService;
