import Setting from "../../models/Setting";

/**
 * Retorna o valor de uma configuração pública (sem autenticação JWT).
 * Apenas keys presentes em `publicSettingsKeys` são acessíveis.
 * Usado para o frontend buscar logo, cores e nome antes do login.
 *
 * Ver: docs/FLUXO-CONFIGURACOES-PUBLICAS-BRANDING.md
 */

interface Request {
  key: string;
}

const publicSettingsKeys = [
  "allowSignup",
  "primaryColorLight",
  "primaryColorDark",
  "appLogoLight",
  "appLogoDark",
  "appLogoFavicon",
  "appName"
]

const GetPublicSettingService = async ({
  key
}: Request): Promise<string | undefined> => {


  console.log("|======== GetPublicSettingService ========|")
  console.log("key", key)
  console.log("|=========================================|")

  if (!publicSettingsKeys.includes(key)) {
    return null;
  }

  const setting = await Setting.findOne({
    where: {
      companyId: 1,
      key
    }
  });

  return setting?.value;
};

export default GetPublicSettingService;
