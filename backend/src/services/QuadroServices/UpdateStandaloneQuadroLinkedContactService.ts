import TicketQuadro from "../../models/TicketQuadro";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";

const UpdateStandaloneQuadroLinkedContactService = async (
  quadroUuid: string,
  companyId: number,
  linkedContactId: number | null
): Promise<TicketQuadro> => {
  const quadro = await TicketQuadro.findOne({
    where: { uuid: quadroUuid.trim(), companyId, ticketId: null }
  });

  if (!quadro) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  if (linkedContactId != null) {
    const c = await Contact.findOne({ where: { id: linkedContactId, companyId } });
    if (!c) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }
  }

  await quadro.update({ linkedContactId: linkedContactId ?? null });
  return quadro.reload();
};

export default UpdateStandaloneQuadroLinkedContactService;
