import { Sequelize, fn, col, where, Op, Filterable } from "sequelize";
import { intersection } from "lodash";
import removeAccents from "remove-accents";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactTag from "../../models/ContactTag";

const buildFilteredWhere = async ({
  companyId,
  searchParam = "",
  tagsIds,
  isGroup
}: {
  companyId: number;
  searchParam?: string;
  tagsIds?: number[];
  isGroup?: string;
}): Promise<Filterable["where"]> => {
  let whereCondition: Filterable["where"];

  if (searchParam) {
    const sanitizedSearchParam = removeAccents(
      searchParam.toLocaleLowerCase().trim()
    );
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

  if (Array.isArray(tagsIds) && tagsIds.length > 0) {
    const contactTagFilter: number[][] = [];
    const contactTags = await ContactTag.findAll({
      where: { tagId: { [Op.in]: tagsIds } }
    });
    if (contactTags) {
      contactTagFilter.push(contactTags.map(t => t.contactId));
    }
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
    };
  }

  return whereCondition;
};

interface Request {
  companyId: number;
  ids?: number[];
  deleteEntireCompany?: boolean;
  deleteFiltered?: boolean;
  searchParam?: string;
  tagsIds?: number[];
  isGroup?: string;
}

interface Response {
  deleted: number;
  ids: number[];
}

const BulkDeleteContactsService = async ({
  companyId,
  ids,
  deleteEntireCompany,
  deleteFiltered,
  searchParam,
  tagsIds,
  isGroup
}: Request): Promise<Response> => {
  const hasIds = Array.isArray(ids) && ids.length > 0;
  const modes = [hasIds, !!deleteEntireCompany, !!deleteFiltered].filter(Boolean);
  if (modes.length !== 1) {
    throw new AppError(
      "Use apenas um modo: lista de ids, deleteFiltered ou deleteEntireCompany.",
      400
    );
  }

  let where: Filterable["where"];

  if (hasIds) {
    const uniq = [
      ...new Set(
        (ids as number[])
          .map(n => Number(n))
          .filter(n => Number.isFinite(n) && n > 0)
      )
    ];
    if (!uniq.length) {
      return { deleted: 0, ids: [] };
    }
    const valid = await Contact.findAll({
      where: { companyId, id: { [Op.in]: uniq } },
      attributes: ["id"]
    });
    const allowedIds = valid.map(c => c.id);
    if (!allowedIds.length) {
      return { deleted: 0, ids: [] };
    }
    where = { companyId, id: { [Op.in]: allowedIds } };
  } else if (deleteEntireCompany) {
    where = { companyId };
  } else {
    where = await buildFilteredWhere({
      companyId,
      searchParam,
      tagsIds,
      isGroup
    });
  }

  const rows = await Contact.findAll({ where, attributes: ["id"] });
  const deletedIds = rows.map(r => r.id);
  if (deletedIds.length) {
    await Contact.destroy({ where: { companyId, id: { [Op.in]: deletedIds } } });
  }

  return { deleted: deletedIds.length, ids: deletedIds };
};

export default BulkDeleteContactsService;
