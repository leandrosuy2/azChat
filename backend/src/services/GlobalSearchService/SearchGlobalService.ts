import { Op, fn, col, where } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Product from "../../models/Product";
import Company from "../../models/Company";
import Queue from "../../models/Queue";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import removeAccents from "remove-accents";

export interface GlobalSearchResult {
  id: string;
  type: string;
  title: string;
  description: string;
  path: string;
  group: string;
}

interface Request {
  query: string;
  companyId: number;
  userId: number;
  profile: string;
  superUser?: boolean;
  limit?: number;
}

const likeText = (field: string, query: string) =>
  where(fn("LOWER", fn("unaccent", col(field))), {
    [Op.like]: `%${query}%`
  });

const SearchGlobalService = async ({
  query,
  companyId,
  userId,
  profile,
  superUser = false,
  limit = 6
}: Request): Promise<GlobalSearchResult[]> => {
  const term = removeAccents(String(query || "").trim().toLowerCase());
  if (term.length < 2) return [];

  const isAdmin = profile === "admin" || superUser === true;
  const queueScope = isAdmin
    ? {}
    : {
        [Op.or]: [{ userId }, { userId: null }, { status: "pending" }]
      };

  const [contacts, tickets, products, companies] = await Promise.all([
    Contact.findAll({
      where: {
        companyId,
        [Op.or]: [
          likeText("name", term),
          { number: { [Op.like]: `%${term.replace(/\D/g, "") || term}%` } },
          likeText("email", term)
        ]
      },
      attributes: ["id", "name", "number", "email", "channel"],
      limit,
      order: [["updatedAt", "DESC"]]
    }),
    Ticket.findAll({
      where: {
        companyId,
        ...queueScope,
        [Op.or]: [
          likeText("contact.name", term),
          { "$contact.number$": { [Op.like]: `%${term.replace(/\D/g, "") || term}%` } },
          likeText("lastMessage", term)
        ]
      },
      include: [
        {
          model: Contact,
          as: "contact",
          attributes: ["id", "name", "number", "channel"]
        },
        {
          model: Queue,
          as: "queue",
          attributes: ["id", "name"]
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name"]
        },
        {
          model: Whatsapp,
          as: "whatsapp",
          attributes: ["id", "name", "channel"]
        }
      ],
      attributes: ["id", "uuid", "status", "lastMessage", "updatedAt"],
      limit,
      order: [["updatedAt", "DESC"]],
      subQuery: false
    }),
    Product.findAll({
      where: {
        companyId,
        [Op.or]: [
          likeText("name", term),
          likeText("description", term),
          likeText("code", term)
        ]
      },
      attributes: ["id", "name", "code", "price", "status"],
      limit,
      order: [["updatedAt", "DESC"]]
    }),
    isAdmin
      ? Company.findAll({
          where: {
            [Op.or]: [
              likeText("name", term),
              likeText("email", term),
              likeText("phone", term)
            ]
          },
          attributes: ["id", "name", "email", "phone", "status"],
          limit,
          order: [["updatedAt", "DESC"]]
        })
      : Promise.resolve([])
  ]);

  const results: GlobalSearchResult[] = [];

  contacts.forEach(contact => {
    results.push({
      id: `contact-${contact.id}`,
      type: "Cliente",
      group: "Clientes",
      title: contact.name || contact.number,
      description: [contact.channel || "contato", contact.number, contact.email]
        .filter(Boolean)
        .join(" · "),
      path: `/contacts?search=${encodeURIComponent(contact.name || contact.number || "")}`
    });
  });

  tickets.forEach(ticket => {
    const contact = (ticket as any).contact;
    const queue = (ticket as any).queue;
    const statusLabel = ticket.status === "open" ? "Em atendimento" : ticket.status === "pending" ? "Aguardando" : ticket.status;
    results.push({
      id: `ticket-${ticket.id}`,
      type: "Atendimento",
      group: "Atendimentos",
      title: contact?.name || `Atendimento #${ticket.id}`,
      description: [statusLabel, queue?.name, ticket.lastMessage].filter(Boolean).join(" · "),
      path: `/tickets/${ticket.uuid || ticket.id}`
    });
  });

  products.forEach(product => {
    results.push({
      id: `product-${product.id}`,
      type: "Produto",
      group: "Produtos",
      title: product.name,
      description: [product.code ? `Codigo ${product.code}` : "", product.status].filter(Boolean).join(" · "),
      path: `/products?search=${encodeURIComponent(product.name || "")}`
    });
  });

  companies.forEach(company => {
    results.push({
      id: `company-${company.id}`,
      type: "Empresa",
      group: "Empresas",
      title: company.name,
      description: [company.email, company.phone, company.status ? "Ativa" : "Inativa"].filter(Boolean).join(" · "),
      path: `/companies?search=${encodeURIComponent(company.name || "")}`
    });
  });

  return results.slice(0, 20);
};

export default SearchGlobalService;
