import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import GetDefaultWhatsAppByUser from "./GetDefaultWhatsAppByUser";

/**
 * Escolhe uma conexão WhatsApp **CONNECTED** da empresa.
 * Ordem: id explícito (se conectado) → qualquer conectada (prioriza `isDefault`) → conexão do usuário (se conectada).
 */
const GetDefaultWhatsApp = async (
  whatsappId?: number,
  companyId: number | null = null,
  userId?: number
): Promise<Whatsapp> => {
  if (companyId == null || companyId === undefined) {
    throw new AppError("Empresa não informada para localizar conexão WhatsApp.", 400);
  }

  const pickConnectedForCompany = async (): Promise<Whatsapp | null> => {
    return await Whatsapp.findOne({
      where: { status: "CONNECTED", companyId },
      order: [
        ["isDefault", "DESC"],
        ["id", "ASC"]
      ]
    });
  };

  if (whatsappId) {
    const byId = await Whatsapp.findOne({
      where: { id: whatsappId, companyId }
    });
    if (byId?.status === "CONNECTED") {
      return byId;
    }
  }

  let connection = await pickConnectedForCompany();

  if (userId) {
    const whatsappByUser = await GetDefaultWhatsAppByUser(userId);
    if (whatsappByUser?.status === "CONNECTED") {
      connection = whatsappByUser;
    }
  }

  if (!connection) {
    throw new AppError(
      `Nenhuma conexão WhatsApp está conectada para esta empresa (empresa ${companyId}). ` +
        `Abra o menu Conexões, finalize o pareamento (QR Code) e aguarde o status "CONECTADO"; depois tente importar os contatos novamente.`,
      400
    );
  }

  return connection;
};

export default GetDefaultWhatsApp;
