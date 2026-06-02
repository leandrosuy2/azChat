import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Announcement from "../../models/Announcement";

interface Data {
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

const CreateService = async (data: Data): Promise<Announcement> => {
  const { title, text } = data;

  const ticketnoteSchema = Yup.object().shape({
    title: Yup.string().required("ERR_ANNOUNCEMENT_REQUIRED"),
    text: Yup.string().required("ERR_ANNOUNCEMENT_REQUIRED")
  });

  try {
    await ticketnoteSchema.validate({ title, text });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const record = await Announcement.create({
    ...data,
    targetAudience: normalizeAudience(data.targetAudience)
  });

  return record;
};

export default CreateService;
