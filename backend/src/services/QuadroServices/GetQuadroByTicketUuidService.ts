import Ticket from "../../models/Ticket";
import TicketQuadro from "../../models/TicketQuadro";
import TicketQuadroAnexo from "../../models/TicketQuadroAnexo";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { buildTicketWhereUuidOrId } from "../../helpers/FindTicketByUuidOrId";
import { quadroAttachmentPublicUrl } from "../../helpers/QuadroAttachmentPaths";
import {
  batchFetchUnlinkedMirrorByQuadroId,
  isUnlinkedMirrorView,
  readUnlinkedMirrorMap,
  type UnlinkedMirrorPayload
} from "../../helpers/UnlinkedMirrorQuadro";

export interface QuadroResponse {
  standalone?: boolean;
  ticket: {
    id: number;
    uuid: string;
    contact: { id: number; name: string; number: string; urlPicture?: string; profilePicUrl?: string };
    queue: { id: number; name: string; color: string };
    user: { id: number; name: string };
    whatsapp: { id: number; name: string };
  };
  quadro: {
    ticketId: number | null;
    status: string;
    description: string | null;
    valorServico: number | null;
    valorEntrada: number | null;
    nomeProjeto: string | null;
    dataPrazo: string | null;
    detalhesProcesso: string | null;
    detalhesProcessoItens: Array<{
      id: string;
      titulo: string;
      descricao: string;
      campos?: Array<{ id: string; nome: string; valor: string }>;
    }>;
    customFields: any[];
    quadroGroupId: number | null;
    sharedGroupIds: number[];
    quadroSharedGroupIds?: number[];
    quadroLinkType?: string;
    quadroSharedStagesByGroup?: Record<string, number[]>;
    linkedContactId?: number | null;
    updatedAt: Date;
  } | null;
  attachments: Array<{
    id: number;
    name: string;
    url: string;
    isCapa: boolean;
    createdAt: Date;
    processoBlocoId: string | null;
    legenda: string | null;
  }>;
}

async function buildQuadroResponseForTicket(
  ticket: Ticket,
  viewQuadroGroupId?: number | null
): Promise<QuadroResponse> {
  const quadro = await TicketQuadro.findOne({
    where: { ticketId: ticket.id }
  });

  const anexos = await TicketQuadroAnexo.findAll({
    where: { ticketId: ticket.id },
    order: [["createdAt", "ASC"]]
  });

  const c = ticket.contact;
  const contactData = c
    ? {
        id: c.id,
        name: c.name,
        number: c.number,
        urlPicture: (c as any).urlPicture ?? undefined,
        profilePicUrl: c.profilePicUrl ?? undefined
      }
    : { id: 0, name: "", number: "", urlPicture: undefined, profilePicUrl: undefined };
  const queue = ticket.queue
    ? { id: ticket.queue.id, name: ticket.queue.name, color: ticket.queue.color }
    : { id: 0, name: "", color: "" };
  const user = ticket.user ? { id: ticket.user.id, name: ticket.user.name } : { id: 0, name: "" };
  const whatsapp = ticket.whatsapp
    ? { id: ticket.whatsapp.id, name: ticket.whatsapp.name }
    : { id: 0, name: "" };

  const attachments = anexos.map((a) => ({
    id: a.id,
    name: a.name,
    url: quadroAttachmentPublicUrl(ticket.companyId, a.path, {
      ticketId: ticket.id,
      ticketQuadroId: null
    }),
    isCapa: a.isCapa,
    createdAt: a.createdAt,
    processoBlocoId: a.processoBlocoId ?? null,
    legenda: a.legenda ?? null
  }));

  let unlinkedBlob: Record<string, UnlinkedMirrorPayload> | undefined;
  if (quadro?.id != null) {
    const m = await batchFetchUnlinkedMirrorByQuadroId([quadro.id], ticket.companyId);
    unlinkedBlob = m[quadro.id];
  }

  return {
    standalone: false,
    ticket: {
      id: ticket.id,
      uuid: ticket.uuid,
      contact: contactData,
      queue,
      user,
      whatsapp
    },
    quadro: quadro ? mapQuadroRowForView(quadro, viewQuadroGroupId, unlinkedBlob) : null,
    attachments
  };
}

export function mapQuadroRowForView(
  quadro: TicketQuadro,
  viewGroupId?: number | null,
  unlinkedBlob?: Record<string, UnlinkedMirrorPayload>
) {
  const base = {
    ticketId: quadro.ticketId ?? null,
    status: quadro.status,
    description: quadro.description,
    valorServico: quadro.valorServico != null ? Number(quadro.valorServico) : null,
    valorEntrada: quadro.valorEntrada != null ? Number(quadro.valorEntrada) : null,
    nomeProjeto: quadro.nomeProjeto ?? null,
    dataPrazo: quadro.dataPrazo ?? null,
    detalhesProcesso: quadro.detalhesProcesso ?? null,
    detalhesProcessoItens: Array.isArray(quadro.detalhesProcessoItens) ? quadro.detalhesProcessoItens : [],
    customFields: quadro.customFields ?? [],
    quadroGroupId: quadro.quadroGroupId ?? null,
    sharedGroupIds: quadro.sharedGroupIds ?? [],
    quadroSharedGroupIds: quadro.sharedGroupIds ?? [],
    quadroLinkType: quadro.linkType ?? "linked",
    quadroSharedStagesByGroup: quadro.sharedStagesByGroup ?? {},
    linkedContactId: quadro.linkedContactId ?? null,
    updatedAt: quadro.updatedAt
  };
  if (viewGroupId == null || !isUnlinkedMirrorView(quadro, viewGroupId)) {
    return base;
  }
  const map = unlinkedBlob ?? readUnlinkedMirrorMap(quadro);
  const ov = map[String(viewGroupId)] || {};
  return {
    ...base,
    status: ov.status !== undefined ? ov.status : base.status,
    description: ov.description !== undefined ? ov.description : base.description,
    valorServico:
      ov.valorServico !== undefined ? ov.valorServico : base.valorServico,
    valorEntrada:
      ov.valorEntrada !== undefined ? ov.valorEntrada : base.valorEntrada,
    nomeProjeto: ov.nomeProjeto !== undefined ? ov.nomeProjeto : base.nomeProjeto,
    dataPrazo: ov.dataPrazo !== undefined ? ov.dataPrazo : base.dataPrazo,
    detalhesProcesso:
      ov.detalhesProcesso !== undefined ? ov.detalhesProcesso : base.detalhesProcesso,
    detalhesProcessoItens:
      ov.detalhesProcessoItens !== undefined
        ? Array.isArray(ov.detalhesProcessoItens)
          ? ov.detalhesProcessoItens
          : base.detalhesProcessoItens
        : base.detalhesProcessoItens,
    customFields:
      ov.customFields !== undefined ? ov.customFields : base.customFields
  };
}

const GetQuadroByTicketUuidService = async (
  publicParam: string,
  companyId: number,
  viewQuadroGroupId?: number | null
): Promise<QuadroResponse> => {
  const trimmed = String(publicParam || "").trim();

  const ticket = await Ticket.findOne({
    where: buildTicketWhereUuidOrId(trimmed, companyId),
    attributes: ["id", "uuid", "contactId", "queueId", "userId", "whatsappId", "companyId"],
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name", "number", "profilePicUrl", "urlPicture", "companyId"] },
      { model: Queue, as: "queue", attributes: ["id", "name", "color"] },
      { model: User, as: "user", attributes: ["id", "name"] },
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] }
    ]
  });

  if (ticket) {
    return buildQuadroResponseForTicket(ticket, viewQuadroGroupId);
  }

  const quadroRow = await TicketQuadro.findOne({
    where: { uuid: trimmed, companyId },
    include: [{ model: Contact, as: "linkedContact", attributes: ["id", "name", "number", "profilePicUrl", "urlPicture", "companyId"] }]
  });

  if (quadroRow?.ticketId) {
    const ticketFromQuadro = await Ticket.findOne({
      where: { id: quadroRow.ticketId, companyId },
      attributes: ["id", "uuid", "contactId", "queueId", "userId", "whatsappId", "companyId"],
      include: [
        { model: Contact, as: "contact", attributes: ["id", "name", "number", "profilePicUrl", "urlPicture", "companyId"] },
        { model: Queue, as: "queue", attributes: ["id", "name", "color"] },
        { model: User, as: "user", attributes: ["id", "name"] },
        { model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] }
      ]
    });
    if (ticketFromQuadro) {
      return buildQuadroResponseForTicket(ticketFromQuadro, viewQuadroGroupId);
    }
  }

  if (!quadroRow || quadroRow.ticketId) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const c = (quadroRow as any).linkedContact;
  const contactData = c
    ? {
        id: c.id,
        name: c.name,
        number: c.number,
        urlPicture: c.urlPicture ?? undefined,
        profilePicUrl: c.profilePicUrl ?? undefined
      }
    : { id: 0, name: "Quadro livre", number: "", urlPicture: undefined, profilePicUrl: undefined };

  const anexosStandalone = await TicketQuadroAnexo.findAll({
    where: { ticketQuadroId: quadroRow.id },
    order: [["createdAt", "ASC"]]
  });
  const attachmentsStandalone = anexosStandalone.map((a) => ({
    id: a.id,
    name: a.name,
    url: quadroAttachmentPublicUrl(companyId, a.path, {
      ticketId: null,
      ticketQuadroId: quadroRow.id
    }),
    isCapa: a.isCapa,
    createdAt: a.createdAt,
    processoBlocoId: a.processoBlocoId ?? null,
    legenda: a.legenda ?? null
  }));

  const ulStandalone = await batchFetchUnlinkedMirrorByQuadroId(
    [quadroRow.id],
    companyId
  );

  return {
    standalone: true,
    ticket: {
      id: 0,
      uuid: quadroRow.uuid,
      contact: contactData,
      queue: { id: 0, name: "—", color: "#9e9e9e" },
      user: { id: 0, name: "—" },
      whatsapp: { id: 0, name: "—" }
    },
    quadro: mapQuadroRowForView(
      quadroRow,
      viewQuadroGroupId,
      ulStandalone[quadroRow.id]
    ),
    attachments: attachmentsStandalone
  };
};

export default GetQuadroByTicketUuidService;
