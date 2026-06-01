import AppError from "../errors/AppError";

export type QuickMessageAction = "view" | "create" | "edit" | "delete";

const ROLE_DEFAULTS: Record<string, QuickMessageAction[]> = {
  admin: ["view", "create", "edit", "delete"],
  user: ["view", "create", "edit"]
};

const ACTION_TO_KEY: Record<QuickMessageAction, string> = {
  view: "quickMessages:view",
  create: "quickMessages:create",
  edit: "quickMessages:edit",
  delete: "quickMessages:delete"
};

type UserLike = {
  profile?: string;
  super?: boolean;
  permissions?: Record<string, boolean> | string | null;
};

const parsePermissions = (raw: UserLike["permissions"]): Record<string, boolean> => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      return j && typeof j === "object" ? j : {};
    } catch {
      return {};
    }
  }
  return raw;
};

export const userHasQuickMessagePermission = (
  user: UserLike,
  action: QuickMessageAction
): boolean => {
  if (user?.super) return true;

  const profile = String(user?.profile || "user");
  const key = ACTION_TO_KEY[action];
  const custom = parsePermissions(user?.permissions);

  if (custom[key] === true) return true;
  if (custom[key] === false) return false;

  const defaults = ROLE_DEFAULTS[profile] || ROLE_DEFAULTS.user;
  return defaults.includes(action);
};

export const assertQuickMessagePermission = (
  user: UserLike,
  action: QuickMessageAction
): void => {
  if (!userHasQuickMessagePermission(user, action)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
};

export default assertQuickMessagePermission;
