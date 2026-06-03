import MetaEventLog from "../../models/MetaEventLog";
import logger from "../../utils/logger";

type MetaEventLogData = {
  companyId: number;
  whatsappId?: number | null;
  channel: string;
  direction: "inbound" | "outbound" | "system";
  eventType: string;
  externalId?: string | null;
  status?: string;
  errorMessage?: string | null;
  payload?: Record<string, unknown> | null;
};

const CreateMetaEventLogService = async (data: MetaEventLogData): Promise<void> => {
  try {
    await MetaEventLog.create({
      companyId: data.companyId,
      whatsappId: data.whatsappId || null,
      channel: data.channel,
      direction: data.direction,
      eventType: data.eventType,
      externalId: data.externalId || null,
      status: data.status || "received",
      errorMessage: data.errorMessage || null,
      payload: data.payload || null
    });
  } catch (error) {
    logger.warn(`[MetaEventLog] falha ao registrar evento: ${error?.message || error}`);
  }
};

export default CreateMetaEventLogService;
