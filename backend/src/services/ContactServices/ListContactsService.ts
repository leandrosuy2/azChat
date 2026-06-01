import { Sequelize, fn, col, where, Op, Filterable } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ContactTag from "../../models/ContactTag";

import { intersection } from "lodash";
import Tag from "../../models/Tag";
import removeAccents from "remove-accents";
import Whatsapp from "../../models/Whatsapp";
import User from "../../models/User";
import ShowUserService from "../UserServices/ShowUserService";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  /** Itens por página (10–100). Padrão 25. */
  limit?: string | number;
  companyId: number;
  tagsIds?: number[];
  isGroup?: string;
  userId?: number;
}

interface Response {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const ListContactsService = async ({
  searchParam = "",
  pageNumber = "1",
  limit: limitRaw,
  companyId,
  tagsIds,
  isGroup,
  userId
}: Request): Promise<Response> => {
  let whereCondition: Filterable["where"];

  if (searchParam) {
    // console.log("searchParam", searchParam)
    const sanitizedSearchParam = removeAccents(searchParam.toLocaleLowerCase().trim());
    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        {
          name: where(
            fn("LOWER", fn("unaccent", col("Contact.name"))),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        { number: { [Op.like]: `%${sanitizedSearchParam}%` } }
      ]
    };
  }

  whereCondition = {
    ...whereCondition,
    companyId
  };

  // const user = await ShowUserService(userId, companyId);

  // console.log(user)
  // if (user.whatsappId) {
  //   whereCondition = {
  //     ...whereCondition,
  //     whatsappId: user.whatsappId
  //   };
  // }

  if (Array.isArray(tagsIds) && tagsIds.length > 0) {

    const contactTagFilter: any[] | null = [];
    // for (let tag of tags) {
    const contactTags = await ContactTag.findAll({
      where: { tagId: { [Op.in]: tagsIds } }
    });
    if (contactTags) {
      contactTagFilter.push(contactTags.map(t => t.contactId));
    }
    // }

    const contactTagsIntersection: number[] = intersection(...contactTagFilter);

    whereCondition = {
      ...whereCondition,
      id: {
        [Op.in]: contactTagsIntersection
      }
    };
  }

  if (isGroup === "false") {
    whereCondition = {
      ...whereCondition,
      isGroup: false
    }
  }


  const parsedLimit = Number(limitRaw);
  const limit = Math.min(
    100,
    Math.max(10, Number.isFinite(parsedLimit) ? parsedLimit : 25)
  );
  const offset = limit * (+pageNumber - 1);

  const { count, rows: contacts } = await Contact.findAndCountAll({
    distinct: true,
    col: "id",
    subQuery: false,
    where: whereCondition,
    attributes: [
      "id",
      "name",
      "number",
      "document",
      "email",
      "isGroup",
      "urlPicture",
      "active",
      "companyId",
      "channel",
      "whatsappId",
      "remoteJid"
    ],
    limit,
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name"]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name"]
      }
    ],
    offset,
    // subQuery: false,
    order: [["name", "ASC"]]
  });

  const hasMore = count > offset + contacts.length;

  return {
    contacts,
    count,
    hasMore
  };
};

export default ListContactsService;
