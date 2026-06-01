import Help from "../../models/Help";
import HelpAttachment from "../../models/HelpAttachment";

/**
 * Retorna o tutorial vinculado a uma área do sistema (usado pelo ícone
 * <HelpHint areaKey="...">). Se houver mais de um, retorna o mais recente.
 * Retorna null quando não há tutorial para a área (o ícone não aparece).
 */
const FindByAreaService = async (areaKey: string): Promise<Help | null> => {
  const record = await Help.findOne({
    where: { areaKey },
    include: [{ model: HelpAttachment, as: "attachments" }],
    order: [["updatedAt", "DESC"]]
  });

  return record;
};

export default FindByAreaService;
