import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Help from "../../models/Help";
import { isValidHelpAreaKey } from "../../constants/helpAreas";

interface Data {
  title: string;
  description?: string;
  content?: string;
  areaKey?: string;
  video?: string;
  link?: string;
}

const CreateService = async (data: Data): Promise<Help> => {
  const { title, description, areaKey } = data;

  const helpSchema = Yup.object().shape({
    title: Yup.string()
      .min(3, "ERR_HELP_INVALID_NAME")
      .required("ERR_HELP_REQUIRED"),
    description: Yup.string().min(3, "ERR_HELP_INVALID_NAME")
  });

  try {
    await helpSchema.validate({ title, description });
  } catch (err) {
    throw new AppError(err.message);
  }

  if (!isValidHelpAreaKey(areaKey)) {
    throw new AppError("ERR_HELP_INVALID_AREA_KEY");
  }

  const record = await Help.create(data);

  return record;
};

export default CreateService;
