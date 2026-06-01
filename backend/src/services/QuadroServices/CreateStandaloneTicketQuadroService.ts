import { v4 as uuidv4 } from "uuid";
import TicketQuadro from "../../models/TicketQuadro";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";

interface Params {
  companyId: number;
  nomeProjeto: string;
  quadroGroupId: number;
  linkedContactId?: number | null;
  kanbanTagId?: number | null;
}

const CreateStandaloneTicketQuadroService = async ({
  companyId,
  nomeProjeto,
  quadroGroupId,
  linkedContactId,
  kanbanTagId
}: Params): Promise<TicketQuadro> => {
  const title = typeof nomeProjeto === "string" ? nomeProjeto.trim() : "";
  if (!title) {
    throw new AppError("ERR_QUADRO_TITLE_REQUIRED", 400);
  }

  if (linkedContactId != null) {
    const c = await Contact.findOne({
      where: { id: linkedContactId, companyId }
    });
    if (!c) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }
  }

  const quadro = await TicketQuadro.create({
    uuid: uuidv4(),
    ticketId: null,
    companyId,
    status: "aguardando",
    description: null,
    nomeProjeto: title,
    quadroGroupId,
    linkedContactId: linkedContactId ?? null,
    kanbanTagId: kanbanTagId ?? null
  });

  return quadro;
};

export default CreateStandaloneTicketQuadroService;
