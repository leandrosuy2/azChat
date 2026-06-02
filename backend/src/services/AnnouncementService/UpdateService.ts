import AppError from "../../errors/AppError";
import Announcement from "../../models/Announcement";

interface Data {
  id: number | string;
  priority: string;
  title: string;
  text: string;
  status: string;
  companyId: number;
  targetAudience?: string;
}

const normalizeAudience = (raw: unknown): string => {
  const value = String(raw || "internal").trim().toLowerCase();
  return ["internal", "clients", "both"].includes(value) ? value : "internal";
};

const UpdateService = async (data: Data): Promise<Announcement> => {
  const { id } = data;

  const record = await Announcement.findOne({
    where: { id, companyId: data.companyId }
  });

  if (!record) {
    throw new AppError("ERR_NO_ANNOUNCEMENT_FOUND", 404);
  }

  await record.update({
    ...data,
    targetAudience: normalizeAudience(data.targetAudience)
  });

  return record;
};

export default UpdateService;
