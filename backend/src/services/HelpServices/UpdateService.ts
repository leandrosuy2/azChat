import AppError from "../../errors/AppError";
import Help from "../../models/Help";
import HelpAttachment from "../../models/HelpAttachment";
import { isValidHelpAreaKey } from "../../constants/helpAreas";

interface Data {
  id: number | string;
  title: string;
  description?: string;
  content?: string;
  areaKey?: string;
  video?: string;
  link?: string;
}

const UpdateService = async (data: Data): Promise<Help> => {
  const { id, areaKey } = data;

  const record = await Help.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_HELP_FOUND", 404);
  }

  if (!isValidHelpAreaKey(areaKey)) {
    throw new AppError("ERR_HELP_INVALID_AREA_KEY");
  }

  await record.update(data);

  await record.reload({ include: [{ model: HelpAttachment, as: "attachments" }] });

  return record;
};

export default UpdateService;
