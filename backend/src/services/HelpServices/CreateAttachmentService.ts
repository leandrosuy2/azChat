import Help from "../../models/Help";
import HelpAttachment from "../../models/HelpAttachment";
import AppError from "../../errors/AppError";

interface Data {
  helpId: string | number;
  file: Express.Multer.File;
}

const resolveType = (mimetype: string): string => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype === "application/pdf") return "pdf";
  return "file";
};

const CreateAttachmentService = async ({
  helpId,
  file
}: Data): Promise<HelpAttachment> => {
  const help = await Help.findByPk(helpId);

  if (!help) {
    throw new AppError("ERR_NO_HELP_FOUND", 404);
  }

  const attachment = await HelpAttachment.create({
    helpId: help.id,
    name: file.originalname,
    // path relativo servido por express.static("/public")
    path: `helps/${help.id}/${file.filename}`,
    type: resolveType(file.mimetype),
    mimetype: file.mimetype,
    size: file.size
  } as HelpAttachment);

  return attachment;
};

export default CreateAttachmentService;
