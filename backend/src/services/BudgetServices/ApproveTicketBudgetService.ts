import { Op } from "sequelize";
import { getIO } from "../../libs/socket";
import logger from "../../utils/logger";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import TicketBudget from "../../models/TicketBudget";
import TicketBudgetOrder from "../../models/TicketBudgetOrder";
import TicketQuadro from "../../models/TicketQuadro";
import MoveTicketQuadroService from "../QuadroServices/MoveTicketQuadroService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import { sumBudgetItems } from "./budgetPayloadUtils";

const emitTicketUpdateForKanban = async (
  ticketId: number,
  companyId: number
): Promise<void> => {
  try {
    const ticket = await ShowTicketService(ticketId, companyId);
    getIO().of(String(companyId)).emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });
  } catch {
    /* noop */
  }
};

interface ApproveParams {
  budget: TicketBudget;
  signerName: string;
  signatureImage?: string | null;
  signerIp?: string | null;
  /** Se false, não envia WhatsApp ao cliente (ex.: aprovação pelo atendente no painel). */
  notifyClient?: boolean;
}

const ApproveTicketBudgetService = async ({
  budget,
  signerName,
  signatureImage,
  signerIp,
  notifyClient = true
}: ApproveParams): Promise<{ budget: TicketBudget; order: TicketBudgetOrder }> => {
  if (budget.status !== "pending") {
    throw new AppError("ERR_BUDGET_NOT_PENDING", 400);
  }

  const nameTrim = String(signerName || "").trim();
  if (!nameTrim) {
    throw new AppError("ERR_BUDGET_SIGNER_NAME_REQUIRED", 400);
  }

  if (budget.ticketId != null) {
    const dup = await TicketBudget.findOne({
      where: {
        ticketId: budget.ticketId,
        companyId: budget.companyId,
        status: "approved",
        id: { [Op.ne]: budget.id }
      }
    });
    if (dup) {
      throw new AppError("ERR_BUDGET_TICKET_ALREADY_APPROVED", 400);
    }
  }

  const total = sumBudgetItems(budget.payload?.items ?? []);
  const year = new Date().getFullYear();
  const orderCount = await TicketBudgetOrder.count({
    where: {
      companyId: budget.companyId,
      createdAt: { [Op.gte]: new Date(`${year}-01-01`) }
    }
  });
  const orderNumber = `PED-${year}-${String(orderCount + 1).padStart(4, "0")}`;

  await budget.update({
    status: "approved",
    signatureSignerName: nameTrim,
    signatureImage: signatureImage || null,
    signedAt: new Date(),
    signerIp: signerIp || null
  });

  const order = await TicketBudgetOrder.create({
    companyId: budget.companyId,
    budgetId: budget.id,
    ticketId: budget.ticketId,
    contactId: budget.contactId,
    orderNumber,
    total,
    items: budget.payload?.items ?? []
  });

  const payload = budget.payload;
  const tagId = payload?.automation?.kanbanTagId;

  if (budget.ticketId != null && tagId != null && Number.isFinite(Number(tagId))) {
    const ticket = await Ticket.findOne({
      where: { id: budget.ticketId, companyId: budget.companyId }
    });
    if (ticket?.quadroGroupId) {
      try {
        await MoveTicketQuadroService({
          ticketId: ticket.id,
          companyId: budget.companyId,
          targetGroupId: ticket.quadroGroupId,
          targetTagId: Number(tagId),
          userId: ticket.userId ?? undefined
        });
        const quadro = await TicketQuadro.findOne({
          where: { ticketId: ticket.id }
        });
        if (quadro) {
          await quadro.update({
            kanbanTagId: Number(tagId),
            status: "em_andamento"
          });
        }
        await emitTicketUpdateForKanban(ticket.id, budget.companyId);
      } catch (e) {
        logger.warn(e);
      }
    }
  }

  if (notifyClient && budget.ticketId) {
    const fullTicket = await Ticket.findByPk(budget.ticketId);
    if (fullTicket?.contactId) {
      try {
        const clientName =
          payload?.client?.name?.trim() || "Cliente";
        await SendWhatsAppMessage({
          body: `Perfeito, ${clientName}! Seu pedido foi aprovado e já está em produção 🚀`,
          ticket: fullTicket
        });
      } catch (e) {
        logger.error(e);
      }
    }
  }

  await budget.reload();
  return { budget, order };
};

export default ApproveTicketBudgetService;
