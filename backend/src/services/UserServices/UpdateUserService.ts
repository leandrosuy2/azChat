import * as Yup from "yup";

import AppError from "../../errors/AppError";
import ShowUserService from "./ShowUserService";
import Company from "../../models/Company";
import User from "../../models/User";

interface UserData {
  email?: string;
  password?: string;
  name?: string;
  profile?: string;
  companyId?: number;
  queueIds?: number[];
  startWork?: string;
  endWork?: string;
  farewellMessage?: string;
  whatsappId?: number;
  allTicket?: string;
  defaultTheme?: string;
  defaultMenu?: string;
  allowGroup?: boolean;
  allHistoric?: string;
  allUserChat?: string;
  userClosePendingTicket?: string;
  showDashboard?: string;
  defaultTicketsManagerWidth?: number;
  allowRealTime?: string;
  allowConnections?: string;
  profileImage?: string;
  permissions?: Record<string, boolean> | null;
  uiPreferences?: Record<string, unknown> | null;
}

interface Request {
  userData: UserData;
  userId: string | number;
  companyId: number;
  requestUserId: number;
}

interface Response {
  id: number;
  name: string;
  email: string;
  profile: string;
}

const SELF_ALLOWED_KEYS = new Set([
  "name",
  "email",
  "password",
  "uiPreferences",
  "defaultTheme",
  "defaultMenu",
  "profileImage",
  "startWork",
  "endWork"
]);

const UpdateUserService = async ({
  userData,
  userId,
  companyId,
  requestUserId
}: Request): Promise<Response | undefined> => {
  const user = await ShowUserService(userId, companyId);
  const requestUser = await User.findByPk(requestUserId);

  if (!requestUser) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  if (requestUser.super === false && user.companyId !== companyId) {
    throw new AppError("O usuario nao pertence a esta empresa");
  }

  const isPrivileged = requestUser.super || requestUser.profile === "admin";
  if (!isPrivileged) {
    if (Number(userId) !== Number(requestUserId)) {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }
  }

  const safeUserData: UserData = isPrivileged ? userData : {};

  if (!isPrivileged) {
    Object.keys(userData).forEach(key => {
      if (SELF_ALLOWED_KEYS.has(key)) {
        (safeUserData as any)[key] = (userData as any)[key];
      }
    });
  }

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    allHistoric: Yup.string(),
    email: Yup.string().email(),
    profile: Yup.string(),
    password: Yup.string()
  });

  const oldUserEmail = user.email;

  const {
    email,
    password,
    profile,
    name,
    queueIds,
    startWork,
    endWork,
    farewellMessage,
    whatsappId,
    allTicket,
    defaultTheme,
    defaultMenu,
    allowGroup,
    allHistoric,
    allUserChat,
    userClosePendingTicket,
    showDashboard,
    allowConnections,
    defaultTicketsManagerWidth,
    allowRealTime,
    profileImage,
    permissions,
    uiPreferences
  } = safeUserData;

  try {
    await schema.validate({ email, password, profile, name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  await user.update({
    ...(email !== undefined ? { email } : {}),
    ...(password !== undefined ? { password } : {}),
    ...(profile !== undefined ? { profile } : {}),
    ...(name !== undefined ? { name } : {}),
    ...(startWork !== undefined ? { startWork } : {}),
    ...(endWork !== undefined ? { endWork } : {}),
    ...(farewellMessage !== undefined ? { farewellMessage } : {}),
    ...(whatsappId !== undefined ? { whatsappId: whatsappId || null } : {}),
    ...(allTicket !== undefined ? { allTicket } : {}),
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
    ...(defaultMenu !== undefined ? { defaultMenu } : {}),
    ...(allowGroup !== undefined ? { allowGroup } : {}),
    ...(allHistoric !== undefined ? { allHistoric } : {}),
    ...(allUserChat !== undefined ? { allUserChat } : {}),
    ...(userClosePendingTicket !== undefined ? { userClosePendingTicket } : {}),
    ...(showDashboard !== undefined ? { showDashboard } : {}),
    ...(defaultTicketsManagerWidth !== undefined ? { defaultTicketsManagerWidth } : {}),
    ...(allowRealTime !== undefined ? { allowRealTime } : {}),
    ...(profileImage !== undefined ? { profileImage } : {}),
    ...(allowConnections !== undefined ? { allowConnections } : {}),
    ...(permissions !== undefined ? { permissions } : {}),
    ...(uiPreferences !== undefined ? { uiPreferences } : {})
  });

  if (queueIds !== undefined) {
    await user.$set("queues", queueIds);
  }

  await user.reload();

  const company = await Company.findByPk(user.companyId);

  if (company && company.email === oldUserEmail && (email !== undefined || password !== undefined)) {
    await company.update({
      ...(email !== undefined ? { email } : {}),
      ...(password !== undefined ? { password } : {})
    });
  }

  const serializedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    companyId: user.companyId,
    company,
    queues: user.queues,
    startWork: user.startWork,
    endWork: user.endWork,
    greetingMessage: user.farewellMessage,
    allTicket: user.allTicket,
    defaultMenu: user.defaultMenu,
    defaultTheme: user.defaultTheme,
    allowGroup: user.allowGroup,
    allHistoric: user.allHistoric,
    userClosePendingTicket: user.userClosePendingTicket,
    showDashboard: user.showDashboard,
    defaultTicketsManagerWidth: user.defaultTicketsManagerWidth,
    allowRealTime: user.allowRealTime,
    allowConnections: user.allowConnections,
    profileImage: user.profileImage,
    permissions: user.permissions || null,
    uiPreferences: user.uiPreferences || null
  };

  return serializedUser;
};

export default UpdateUserService;
