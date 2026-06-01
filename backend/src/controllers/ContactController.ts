import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { head } from "lodash";

import ListContactsService from "../services/ContactServices/ListContactsService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import ShowContactService from "../services/ContactServices/ShowContactService";
import UpdateContactService from "../services/ContactServices/UpdateContactService";
import DeleteContactService from "../services/ContactServices/DeleteContactService";
import BulkDeleteContactsService from "../services/ContactServices/BulkDeleteContactsService";
import GetContactService from "../services/ContactServices/GetContactService";

import CheckContactNumber from "../services/WbotServices/CheckNumber";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import AppError from "../errors/AppError";
import SimpleListService, {
  SearchContactParams
} from "../services/ContactServices/SimpleListService";
import ContactCustomField from "../models/ContactCustomField";
import ToggleAcceptAudioContactService from "../services/ContactServices/ToggleAcceptAudioContactService";
import BlockUnblockContactService from "../services/ContactServices/BlockUnblockContactService";
import { ImportContactsService } from "../services/ContactServices/ImportContactsService";
import NumberSimpleListService from "../services/ContactServices/NumberSimpleListService";
import CreateOrUpdateContactServiceForImport from "../services/ContactServices/CreateOrUpdateContactServiceForImport";
import UpdateContactWalletsService from "../services/ContactServices/UpdateContactWalletsService";

import FindContactTags from "../services/ContactServices/FindContactTags";
import ListContactProcessesService from "../services/QuadroServices/ListContactProcessesService";
import { log } from "console";
import ToggleDisableBotContactService from "../services/ContactServices/ToggleDisableBotContactService";
import GetDefaultWhatsApp from "../helpers/GetDefaultWhatsApp";
import Contact from "../models/Contact";
import Tag from "../models/Tag";
import ContactTag from "../models/ContactTag";
import logger from "../utils/logger";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  /** Itens por página (10–100) */
  limit?: string;
  contactTag: string;
  isGroup?: string;
};

type IndexGetContactQuery = {
  name: string;
  number: string;
};

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}
interface ContactData {
  name: string;
  number: string;
  email?: string;
  extraInfo?: ExtraInfo[];
  disableBot?: boolean;
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



export const importXls = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { number, name, email, validateContact, tags } = req.body;
  const simpleNumber = String(number).replace(/[^\d.-]+/g, '');
  let validNumber = simpleNumber;


  if (validateContact === "true") {
    validNumber = await CheckContactNumber(simpleNumber, companyId);
  }
  /**
   * Código desabilitado por demora no retorno
   */
  // 
  // const profilePicUrl = await GetProfilePicUrl(validNumber, companyId);
  // const defaultWhatsapp = await GetDefaultWhatsApp(companyId);

  const contactData = {
    name: `${name}`,
    number: validNumber,
    profilePicUrl: "",
    isGroup: false,
    email,
    companyId,
    // whatsappId: defaultWhatsapp.id
  };

  const contact = await CreateOrUpdateContactServiceForImport(contactData);

  if (tags) {
    const tagList = tags.split(',').map(tag => tag.trim());

    for (const tagName of tagList) {
      try {
        let [tag, created] = await Tag.findOrCreate({
          where: { name: tagName, companyId, color: "#A4CCCC", kanban: 0 }

        });


        // Associate the tag with the contact
        await ContactTag.findOrCreate({
          where: {
            contactId: contact.id,
            tagId: tag.id
          }
        });
      } catch (error) {
        logger.info("Erro ao criar Tags", error)
      }
    }
  }
  const io = getIO();



  io.of(String(companyId))
    .emit(`company-${companyId}-contact`, {
      action: "create",
      contact
    });

  return res.status(200).json(contact);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    searchParam,
    pageNumber,
    limit,
    contactTag: tagIdsStringified,
    isGroup
  } = req.query as IndexQuery;
  const { id: userId, companyId } = req.user;

  let tagsIds: number[] = [];

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  const { contacts, count, hasMore } = await ListContactsService({
    searchParam,
    pageNumber,
    limit,
    companyId,
    tagsIds,
    isGroup,
    userId: Number(userId)
  });

  return res.json({ contacts, count, hasMore });
};

export const getContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { name, number } = req.body as IndexGetContactQuery;
  const { companyId } = req.user;

  console.log("getContact", { companyId, name, number })

  const contact = await GetContactService({
    name,
    number,
    companyId
  });

  return res.status(200).json(contact);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const newContact: ContactData = req.body;
  const newRemoteJid = newContact.number;

  console.log("store", { companyId, newContact })

  newContact.number = String(newContact.number || "").replace(/\D/g, "");

  const findContact = await Contact.findOne({
    where: {
      number: newContact.number,
      companyId
    }
  });
  if (findContact) {
    throw new AppError("Contact already exists");
  }

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    number: Yup.string()
      .required()
      .matches(/^\d+$/, "Invalid number format. Only numbers is allowed."),
    document: Yup.string()
      .optional()
      .nullable()
      .test(
        "doc-len",
        "CPF/CNPJ: informe 11 dígitos (CPF) ou 14 dígitos (CNPJ).",
        val => {
          if (val === undefined || val === null || val === "") return true;
          const d = String(val).replace(/\D/g, "");
          return d.length === 11 || d.length === 14;
        }
      )
  });

  try {
    await schema.validate(newContact);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  if (newContact.document) {
    newContact.document = String(newContact.document).replace(/\D/g, "");
  } else {
    newContact.document = undefined;
  }

  const validNumber = await CheckContactNumber(newContact.number, companyId);

  /**
   * Código desabilitado por demora no retorno
   */
  // const profilePicUrl = await GetProfilePicUrl(validNumber.jid, companyId);

  const contact = await CreateContactService({
    ...newContact,
    number: validNumber,
    // profilePicUrl,
    companyId
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-contact`, {
      action: "create",
      contact
    });

  return res.status(200).json(contact);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId } = req.user;

  const contact = await ShowContactService(contactId, companyId);

  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const contactData: ContactData = req.body;
  const { companyId } = req.user;
  const { contactId } = req.params;

  const schema = Yup.object().shape({
    name: Yup.string(),
    number: Yup.string()
      .optional()
      .test(
        "digits-only",
        "Invalid number format. Only numbers is allowed.",
        (val) => val === undefined || val === null || val === "" || /^\d+$/.test(String(val))
      ),
    document: Yup.string()
      .optional()
      .nullable()
      .test(
        "doc-len",
        "CPF/CNPJ: informe 11 dígitos (CPF) ou 14 dígitos (CNPJ).",
        val => {
          if (val === undefined || val === null || val === "") return true;
          const d = String(val).replace(/\D/g, "");
          return d.length === 11 || d.length === 14;
        }
      )
  });

  try {
    await schema.validate(contactData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  if (contactData.document !== undefined) {
    const d = String(contactData.document || "").replace(/\D/g, "");
    contactData.document = d.length ? d : null;
  }

  const oldContact = await ShowContactService(contactId, companyId);

  /** Só valida no WhatsApp quando o cliente envia um número novo explicitamente (PUT parcial sem `number` não deve disparar check). */
  const newNumberRaw =
    contactData.number !== undefined && contactData.number !== null && String(contactData.number).trim() !== ""
      ? String(contactData.number).replace(/\D/g, "")
      : undefined;

  if (
    newNumberRaw !== undefined &&
    oldContact.number != newNumberRaw &&
    oldContact.channel == "whatsapp"
  ) {
    const isGroup = oldContact && oldContact.remoteJid ? oldContact.remoteJid.endsWith("@g.us") : oldContact.isGroup;
    const validNumber = await CheckContactNumber(newNumberRaw, companyId, isGroup);
    contactData.number = validNumber;
  }

  const contact = await UpdateContactService({
    contactData,
    contactId,
    companyId
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-contact`, {
      action: "update",
      contact
    });

  return res.status(200).json(contact);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId } = req.user;

  await ShowContactService(contactId, companyId);

  await DeleteContactService(contactId);

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-contact`, {
      action: "delete",
      contactId
    });

  return res.status(200).json({ message: "Contact deleted" });
};

export const bulkDelete = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    ids: Yup.array().of(Yup.number().integer().positive()).optional(),
    deleteEntireCompany: Yup.boolean().optional(),
    deleteFiltered: Yup.boolean().optional(),
    searchParam: Yup.string().optional(),
    contactTag: Yup.string().optional(),
    isGroup: Yup.string().optional()
  });

  const body = await schema.validate(req.body, { stripUnknown: true });

  let tagsIds: number[] = [];
  if (body.contactTag) {
    try {
      tagsIds = JSON.parse(body.contactTag);
    } catch {
      tagsIds = [];
    }
    if (!Array.isArray(tagsIds)) tagsIds = [];
  }

  const { deleted, ids } = await BulkDeleteContactsService({
    companyId,
    ids: body.ids,
    deleteEntireCompany: body.deleteEntireCompany === true,
    deleteFiltered: body.deleteFiltered === true,
    searchParam: body.searchParam || "",
    tagsIds,
    isGroup: body.isGroup
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-contact`, {
    action: "bulk-delete",
    contactIds: ids
  });

  return res.status(200).json({ deleted, contactIds: ids });
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { name } = req.query as unknown as SearchContactParams;
  const { companyId } = req.user;

  const contacts = await SimpleListService({ name, companyId });

  return res.json(contacts);
};

export const toggleAcceptAudio = async (
  req: Request,
  res: Response
): Promise<Response> => {
  var { contactId } = req.params;
  const { companyId } = req.user;
  const contact = await ToggleAcceptAudioContactService({ contactId });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-contact`, {
      action: "update",
      contact
    });

  return res.status(200).json(contact);
};

export const blockUnblock = async (
  req: Request,
  res: Response
): Promise<Response> => {
  var { contactId } = req.params;
  const { companyId } = req.user;
  const { active } = req.body;

  const contact = await BlockUnblockContactService({ contactId, companyId, active });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-contact`, {
      action: "update",
      contact
    });

  return res.status(200).json(contact);
};

export const upload = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const file: Express.Multer.File = head(files) as Express.Multer.File;
  const { companyId } = req.user;

  const response = await ImportContactsService(companyId, file);

  const io = getIO();

  io.of(String(companyId))
    .emit(`company-${companyId}-contact`, {
      action: "reload",
      records: response
    });

  return res.status(200).json(response);
};

export const getContactProfileURL = async (req: Request, res: Response) => {
  const { number } = req.params
  const { companyId } = req.user;

  console.log("getContactProfileURL", { number, companyId })
  if (number) {
    const validNumber = await CheckContactNumber(number, companyId);


    const profilePicUrl = await GetProfilePicUrl(validNumber, companyId);

    const contact = await NumberSimpleListService({ number: validNumber, companyId: companyId })

    let obj: any;
    if (contact.length > 0) {
      obj = {
        contactId: contact[0].id,
        profilePicUrl: profilePicUrl
      }
    } else {
      obj = {
        contactId: 0,
        profilePicUrl: profilePicUrl
      }
    }
    
    return res.status(200).json(obj);
  }

  };

  export const getContactVcard = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { name, number } = req.query as IndexGetContactQuery;
    const { companyId } = req.user;

    let vNumber = number;
    const numberDDI = vNumber.toString().substr(0, 2);
    const numberDDD = vNumber.toString().substr(2, 2);
    const numberUser = vNumber.toString().substr(-8, 8);

    if (numberDDD <= '30' && numberDDI === '55') {
      console.log("menor 30")
      vNumber = `${numberDDI + numberDDD + 9 + numberUser}@s.whatsapp.net`;
    } else if (numberDDD > '30' && numberDDI === '55') {
      console.log("maior 30")
      vNumber = `${numberDDI + numberDDD + numberUser}@s.whatsapp.net`;
    } else {
      vNumber = `${number}@s.whatsapp.net`;
    }


    const contact = await GetContactService({
      name,
      number,
      companyId
    });

    return res.status(200).json(contact);
  };

  export const getContactTags = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { contactId } = req.params;

    const contactTags = await FindContactTags({ contactId });

    let tags = false;

    if (contactTags.length > 0) {
      tags = true;
    }

    return res.status(200).json({ tags: tags });

  }

  export const toggleDisableBot = async (req: Request, res: Response): Promise<Response> => {
    var { contactId } = req.params;
    const { companyId } = req.user;
    const contact = await ToggleDisableBotContactService({ contactId });

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-contact`, {
        action: "update",
        contact
      });

    return res.status(200).json(contact);
  };

  export const updateContactWallet = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { wallets } = req.body;
    const { contactId } = req.params;
    const { companyId } = req.user;

    const contact = await UpdateContactWalletsService({
      wallets,
      contactId,
      companyId
    });

    return res.status(200).json(contact);
  };

  export const listWhatsapp = async (req: Request, res: Response): Promise<Response> => {

    const { name } = req.query as unknown as SearchContactParams;
    const { companyId } = req.user;

    const contactsAll = await SimpleListService({ name, companyId });

    const contacts = contactsAll.filter(contact => contact.channel == "whatsapp");

    return res.json(contacts);
  };

  export const processes = async (req: Request, res: Response): Promise<Response> => {
    const { contactId } = req.params;
    const { companyId } = req.user;
    const processesData = await ListContactProcessesService(parseInt(contactId, 10), companyId);
    return res.status(200).json({ processes: processesData });
  };