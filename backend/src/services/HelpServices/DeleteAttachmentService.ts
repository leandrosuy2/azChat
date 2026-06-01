import path from "path";
import fs from "fs";
import HelpAttachment from "../../models/HelpAttachment";
import AppError from "../../errors/AppError";
import logger from "../../utils/logger";

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

interface Data {
  helpId: string | number;
  attachmentId: string | number;
}

const DeleteAttachmentService = async ({
  helpId,
  attachmentId
}: Data): Promise<void> => {
  const attachment = await HelpAttachment.findOne({
    where: { id: attachmentId, helpId }
  });

  if (!attachment) {
    throw new AppError("ERR_NO_HELP_ATTACHMENT_FOUND", 404);
  }

  const filePath = path.resolve(publicFolder, attachment.path);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    logger.error(
      `[HelpAttachmentDelete] falha ao remover ${filePath}: ${err}`
    );
  }

  await attachment.destroy();
};

export default DeleteAttachmentService;
