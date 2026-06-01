import AppError from "../../errors/AppError";
import QuickMessage from "../../models/QuickMessage";

interface Data {
  shortcode: string;
  message: string;
  userId: number | string;
  id?: number | string;
  geral: boolean;
  mediaPath?: string | null;
  attachments?: string | null;
  visao: boolean;
  category?: string | null;
  categoryColor?: string | null;
  isFavorite?: boolean;
  autoSend?: boolean;
  useInSlash?: boolean;
}

const UpdateService = async (data: Data): Promise<QuickMessage> => {
  const {
    id,
    shortcode,
    message,
    userId,
    geral,
    mediaPath,
    attachments,
    visao,
    category,
    categoryColor,
    isFavorite,
    autoSend,
    useInSlash
  } = data;

  const record = await QuickMessage.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  if (!record.geral && record.visao && record.userId !== userId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const payload: Record<string, unknown> = {
    shortcode,
    message,
    geral,
    visao,
    category,
    categoryColor,
    isFavorite,
    autoSend,
    useInSlash
  };

  if (mediaPath !== undefined) {
    payload.mediaPath = mediaPath;
  }

  if (attachments !== undefined) {
    payload.attachments = attachments;
  }

  await record.update(payload);

  return record;
};

export default UpdateService;
