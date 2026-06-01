import CompanyLifecycleEvent from "../../models/CompanyLifecycleEvent";

export type CompanyLifecycleEventType =
  | "cadastro_realizado"
  | "primeiro_acesso"
  | "alteracao_plano"
  | "pagamento_confirmado"
  | "vencimento"
  | "inadimplencia"
  | "bloqueio"
  | "desbloqueio"
  | "cancelamento"
  | "reativacao"
  | "alteracao_status";

interface Request {
  companyId: number;
  eventType: CompanyLifecycleEventType | string;
  title: string;
  description?: string | null;
  userId?: number | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  metadata?: Record<string, unknown> | null;
}

const LogCompanyLifecycleEventService = async ({
  companyId,
  eventType,
  title,
  description,
  userId,
  previousStatus,
  newStatus,
  metadata
}: Request): Promise<CompanyLifecycleEvent> => {
  return CompanyLifecycleEvent.create({
    companyId,
    eventType: String(eventType),
    title: String(title).trim(),
    description: description?.trim() || null,
    userId: userId ?? null,
    previousStatus: previousStatus ?? null,
    newStatus: newStatus ?? null,
    metadata: metadata ?? null
  });
};

export default LogCompanyLifecycleEventService;
