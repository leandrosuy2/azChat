import AppError from "../../errors/AppError";
import QuickMessage from "../../models/QuickMessage";

const IncrementUseService = async (
  id: string | number,
  companyId: number
): Promise<QuickMessage> => {
  const record = await QuickMessage.findOne({
    where: { id, companyId }
  });

  if (!record) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  await record.increment("useCount", { by: 1 });
  await record.reload();
  return record;
};

export default IncrementUseService;
