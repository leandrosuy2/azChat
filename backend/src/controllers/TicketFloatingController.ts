import { Request, Response } from "express";
import ListTicketEventosService from "../services/TicketEventoServices/ListTicketEventosService";
import CreateTicketEventoService from "../services/TicketEventoServices/CreateTicketEventoService";
import DeleteTicketEventoService from "../services/TicketEventoServices/DeleteTicketEventoService";
import ListTicketAnotacoesService from "../services/TicketAnotacaoServices/ListTicketAnotacoesService";
import CreateTicketAnotacaoService, {
  buildAnotacaoResponse
} from "../services/TicketAnotacaoServices/CreateTicketAnotacaoService";
import UpdateTicketAnotacaoService from "../services/TicketAnotacaoServices/UpdateTicketAnotacaoService";
import DeleteTicketAnotacaoService from "../services/TicketAnotacaoServices/DeleteTicketAnotacaoService";
import ListTicketLembretesService from "../services/TicketLembreteServices/ListTicketLembretesService";
import CreateTicketLembreteService from "../services/TicketLembreteServices/CreateTicketLembreteService";
import DeleteTicketLembreteService from "../services/TicketLembreteServices/DeleteTicketLembreteService";
import UpdateTicketLembreteService from "../services/TicketLembreteServices/UpdateTicketLembreteService";
import ListTicketLembreteDisparosService from "../services/TicketLembreteServices/ListTicketLembreteDisparosService";
import TestKanbanLembreteDispatchService from "../services/TicketLembreteServices/TestKanbanLembreteDispatchService";
import TicketLembreteDisparo from "../models/TicketLembreteDisparo";
import TicketLembrete from "../models/TicketLembrete";
import Ticket from "../models/Ticket";
import QuadroStatusLog from "../models/QuadroStatusLog";
import User from "../models/User";
import Contact from "../models/Contact";
import TicketQuadro from "../models/TicketQuadro";
import QuadroGroup from "../models/QuadroGroup";
import AppError from "../errors/AppError";
import { resolveTicketIdFromRouteParam } from "../helpers/ResolveTicketIdFromRoute";

// ---- Eventos ----
export const listEventos = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const { eventos } = await ListTicketEventosService(id, companyId);
  return res.status(200).json({ eventos });
};

export const createEvento = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const { setor, responsavel, tipo, data, hora, localizacao, descricao } = req.body;
  const evento = await CreateTicketEventoService(id, companyId, {
    setor,
    responsavel,
    tipo,
    data,
    hora,
    localizacao,
    descricao
  });
  return res.status(201).json({ evento });
};

export const deleteEvento = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId, eventoId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  await DeleteTicketEventoService(id, companyId, parseInt(eventoId, 10));
  return res.status(204).send();
};

// ---- Anotações ----
export const listAnotacoes = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const { anotacoes } = await ListTicketAnotacoesService(id, companyId);
  return res.status(200).json({ anotacoes });
};

export const createAnotacao = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const ticketIdNum = await resolveTicketIdFromRouteParam(ticketId, companyId);

  let texto: string;
  let eventoId: number | null = null;
  let status = "aberta";
  let arquivoNome: string | null = null;
  let arquivoPath: string | null = null;

  if (req.file) {
    texto = (req.body.texto || "").trim();
    eventoId =
      req.body.eventoId != null && req.body.eventoId !== ""
        ? parseInt(String(req.body.eventoId), 10)
        : null;
    status = (req.body.status || "aberta").trim() || "aberta";
    arquivoNome = req.file.originalname || req.file.filename;
    arquivoPath = req.file.filename;
  } else {
    const body = req.body;
    texto = (body.texto || "").trim();
    eventoId =
      body.eventoId != null && body.eventoId !== ""
        ? parseInt(String(body.eventoId), 10)
        : null;
    status = (body.status || "aberta").trim() || "aberta";
  }

  const anotacao = await CreateTicketAnotacaoService(ticketIdNum, companyId, {
    texto,
    eventoId,
    status,
    arquivoNome,
    arquivoPath
  });

  const response = buildAnotacaoResponse(anotacao, companyId, ticketIdNum);
  return res.status(201).json({ anotacao: response });
};

export const updateAnotacao = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId, anotacaoId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const { status, texto } = req.body;
  const anotacao = await UpdateTicketAnotacaoService(
    id,
    companyId,
    parseInt(anotacaoId, 10),
    { status, texto }
  );
  const baseUrl = `${process.env.BACKEND_URL}${process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : ""}`;
  const arquivoUrl = anotacao.arquivoPath
    ? `${baseUrl}/public/company${companyId}/anotacoes/${id}/${anotacao.arquivoPath}`
    : null;
  return res.status(200).json({
    anotacao: {
      id: anotacao.id,
      ticketId: anotacao.ticketId,
      eventoId: anotacao.eventoId,
      texto: anotacao.texto,
      arquivoNome: anotacao.arquivoNome,
      arquivoUrl,
      status: anotacao.status,
      createdAt: anotacao.createdAt
    }
  });
};

export const deleteAnotacao = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId, anotacaoId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  await DeleteTicketAnotacaoService(id, companyId, parseInt(anotacaoId, 10));
  return res.status(204).send();
};

// ---- Lembretes ----
export const listLembretes = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId, id: userId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const { lembretes } = await ListTicketLembretesService(id, companyId, Number(userId));
  return res.status(200).json({ lembretes });
};

export const createLembrete = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const b = req.body;
  const destinoTipoRaw = String(b.destinoTipo || "interno").toLowerCase();
  const destinoTipo =
    destinoTipoRaw === "pessoal" ? "usuario" : destinoTipoRaw === "geral" ? "interno" : b.destinoTipo;
  const destinoId =
    destinoTipoRaw === "pessoal"
      ? Number(req.user.id)
      : b.destinoId != null && b.destinoId !== ""
        ? parseInt(String(b.destinoId), 10)
        : null;
  const lembrete = await CreateTicketLembreteService(id, companyId, {
    nome: b.nome,
    descricao: b.descricao,
    data: b.data,
    hora: b.hora,
    eventoId: b.eventoId != null ? parseInt(String(b.eventoId), 10) : null,
    addGoogle: b.addGoogle === true || b.addGoogle === "true",
    tipoGatilho: b.tipoGatilho,
    ativo: b.ativo,
    mensagemTemplate: b.mensagemTemplate,
    destinoTipo,
    destinoId,
    diasAntecedencia: b.diasAntecedencia != null ? Number(b.diasAntecedencia) : null,
    antecedenciaMinutos:
      b.antecedenciaMinutos != null ? Number(b.antecedenciaMinutos) : null,
    notifyOnShare: b.notifyOnShare === true || b.notifyOnShare === "true",
    notifyShareGroupIds: Array.isArray(b.notifyShareGroupIds)
      ? b.notifyShareGroupIds
      : null,
    quadroGroupId:
      b.quadroGroupId != null ? parseInt(String(b.quadroGroupId), 10) : null
  });
  return res.status(201).json({ lembrete });
};

export const updateLembrete = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId, lembreteId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  const lembrete = await UpdateTicketLembreteService(
    id,
    companyId,
    parseInt(lembreteId, 10),
    req.body
  );
  return res.status(200).json({ lembrete });
};

export const deleteLembrete = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId, lembreteId } = req.params;
  const { companyId } = req.user;
  const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
  await DeleteTicketLembreteService(id, companyId, parseInt(lembreteId, 10));
  return res.status(204).send();
};

export const listLembreteDisparos = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId, lembreteId } = req.params;
  const { companyId } = req.user;
  try {
    const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
    const { disparos } = await ListTicketLembreteDisparosService(
      id,
      companyId,
      parseInt(lembreteId, 10)
    );
    return res.status(200).json({ disparos });
  } catch (e) {
    if (e instanceof AppError) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    throw e;
  }
};

export const listRecentLembreteNotifications = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const limit = Math.min(Math.max(Number(req.query.limit) || 80, 1), 200);

  const disparos = await TicketLembreteDisparo.findAll({
    where: { companyId },
    order: [["createdAt", "DESC"]],
    limit,
    include: [
      {
        model: TicketLembrete,
        attributes: ["id", "nome", "descricao", "mensagemTemplate", "destinoTipo", "destinoId"],
        required: false
      },
      {
        model: Ticket,
        attributes: ["id", "uuid", "contactId", "quadroGroupId", "userId", "queueId"],
        required: false,
        include: [
          { model: Contact, attributes: ["name"], required: false },
          { model: QuadroGroup, attributes: ["name"], required: false },
          {
            model: TicketQuadro,
            attributes: ["nomeProjeto", "quadroGroupId"],
            required: false,
            include: [{ model: QuadroGroup, attributes: ["name"], required: false }]
          }
        ]
      }
    ]
  });

  const userId = Number(req.user.id);

  const notifications = disparos
    .filter(disparo => {
      const lembrete = disparo.lembrete as any;
      const dest = String(lembrete?.destinoTipo || "interno").toLowerCase();
      const destId =
        lembrete?.destinoId != null ? Number(lembrete.destinoId) : null;

      if (dest === "usuario" && destId != null && destId !== userId) {
        return false;
      }
      if (dest === "responsavel" && Number(disparo.ticket?.userId) !== userId) {
        return false;
      }
      if (dest === "interno" && destId != null && destId !== userId) {
        return false;
      }
      return true;
    })
    .map(disparo => {
    const ticket = disparo.ticket as any;
    const quadro = Array.isArray(ticket?.quadros) ? ticket.quadros[0] : null;

    return {
      id: `lembrete-disparo-${disparo.id}`,
      kind: "lembrete",
      kindLabel: "Lembrete",
      title: disparo.lembrete?.nome || `Lembrete #${disparo.lembreteId}`,
      body:
        disparo.lembrete?.mensagemTemplate ||
        disparo.lembrete?.descricao ||
        disparo.corpo ||
        "",
      createdAt: disparo.createdAt,
      ticketId: disparo.ticketId,
      ticketUuid: disparo.ticket?.uuid || null,
      lembreteId: disparo.lembreteId,
      disparoId: disparo.id,
      clientName: ticket?.contact?.name || null,
      boardName: quadro?.group?.name || ticket?.quadroGroup?.name || null,
      cardName: quadro?.nomeProjeto || null,
      destinoTipo: disparo.lembrete?.destinoTipo || null,
      destinoId: disparo.lembrete?.destinoId ?? null,
      whatsappEnviado: !!disparo.canalWhatsapp,
      whatsappErro: disparo.erroWhatsapp || "",
      status: disparo.status
    };
  });

  return res.status(200).json({ notifications });
};

export const listRecentKanbanNotifications = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const limit = Math.min(Math.max(Number(req.query.limit) || 80, 1), 200);

  const logs = await QuadroStatusLog.findAll({
    order: [["createdAt", "DESC"]],
    limit,
    include: [
      {
        model: Ticket,
        attributes: ["id", "uuid", "companyId", "contactId", "quadroGroupId"],
        where: { companyId },
        required: true,
        include: [
          { model: Contact, attributes: ["name"], required: false },
          { model: QuadroGroup, attributes: ["name"], required: false },
          {
            model: TicketQuadro,
            attributes: ["nomeProjeto", "quadroGroupId"],
            required: false,
            include: [{ model: QuadroGroup, attributes: ["name"], required: false }]
          }
        ]
      },
      {
        model: User,
        attributes: ["name"],
        required: false
      }
    ]
  });

  const notifications = logs.map(log => {
    const ticket = log.ticket as any;
    const quadro = Array.isArray(ticket?.quadros) ? ticket.quadros[0] : null;
    const fromLabel = log.fromLabel || "Sem etapa";
    const toLabel = log.toLabel || "Sem etapa";
    const userName = log.user?.name || "Sistema";

    return {
      id: `kanban-move-${log.id}`,
      kind: "kanban_move",
      kindLabel: "Kanban",
      title: "Cartão movido no Kanban",
      body: `${userName} moveu o cartão de ${fromLabel} para ${toLabel}.`,
      createdAt: log.createdAt,
      ticketId: log.ticketId,
      ticketUuid: log.ticket?.uuid || null,
      logId: log.id,
      clientName: ticket?.contact?.name || null,
      boardName: quadro?.group?.name || ticket?.quadroGroup?.name || null,
      cardName: quadro?.nomeProjeto || null,
      fromLabel,
      toLabel,
      userName,
      status: "ok"
    };
  });

  return res.status(200).json({ notifications });
};

export const deleteLembreteNotification = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.disparoId);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "disparoId inválido" });
  }

  const deleted = await TicketLembreteDisparo.destroy({
    where: { id, companyId }
  });

  if (!deleted) {
    return res.status(404).json({ error: "Notificação não encontrada" });
  }

  return res.status(204).send();
};

export const deleteKanbanNotification = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.logId);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "logId inválido" });
  }

  const log = await QuadroStatusLog.findOne({
    where: { id },
    include: [
      {
        model: Ticket,
        attributes: ["id", "companyId"],
        where: { companyId },
        required: true
      }
    ]
  });

  if (!log) {
    return res.status(404).json({ error: "Notificação não encontrada" });
  }

  await log.destroy();
  return res.status(204).send();
};

export const testLembreteDispatch = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId, lembreteId } = req.params;
  const { companyId } = req.user;
  try {
    const id = await resolveTicketIdFromRouteParam(ticketId, companyId);
    await TestKanbanLembreteDispatchService(
      id,
      companyId,
      parseInt(lembreteId, 10)
    );
    return res.status(200).json({ ok: true });
  } catch (e) {
    if (e instanceof AppError) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    throw e;
  }
};
