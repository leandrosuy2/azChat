import path from "path";
import fs from "fs";
import Help from "../../models/Help";
import HelpAttachment from "../../models/HelpAttachment";
import AppError from "../../errors/AppError";
import logger from "../../utils/logger";

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

const DeleteService = async (id: string): Promise<void> => {
  const record = await Help.findOne({
    where: { id },
    include: [{ model: HelpAttachment, as: "attachments" }]
  });

  if (!record) {
    throw new AppError("ERR_NO_HELP_FOUND", 404);
  }

  // O CASCADE remove as linhas de HelpAttachments, mas não os arquivos
  // em disco. Apagamos a pasta do tutorial inteira para não deixar lixo.
  const helpDir = path.resolve(publicFolder, "helps", String(record.id));
  try {
    if (fs.existsSync(helpDir)) {
      fs.rmSync(helpDir, { recursive: true, force: true });
    }
  } catch (err) {
    logger.error(`[HelpDelete] falha ao remover arquivos de ${helpDir}: ${err}`);
  }

  await record.destroy();
};

export default DeleteService;
