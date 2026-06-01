import Help from "../../models/Help";
import HelpAttachment from "../../models/HelpAttachment";

const FindService = async (): Promise<Help[]> => {
  const notes: Help[] = await Help.findAll({
    include: [{ model: HelpAttachment, as: "attachments" }],
    order: [["title", "ASC"]]
  });

  return notes;
};

export default FindService;
