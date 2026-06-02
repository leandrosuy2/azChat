import AppError from "../errors/AppError";

export type KanbanAction = "view" | "create" | "edit" | "delete" | "moveCard";

const ROLE_DEFAULTS: Record<string, KanbanAction[]> = {
  admin: ["view", "create", "edit", "delete", "moveCard"],
  user: ["view", "moveCard"]
};

const ACTION_TO_KEY: Record<KanbanAction, string> = {
  view: "kanban:view",
  create: "kanban:create",
  edit: "kanban:edit",
  delete: "kanban:delete",
  moveCard: "kanban:moveCard"
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
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return raw;
};

export const userHasKanbanPermission = (
  user: UserLike,
  action: KanbanAction
): boolean => {
  if (user?.super) return true;

  const key = ACTION_TO_KEY[action];
  const custom = parsePermissions(user?.permissions);
  if (custom[key] === true) return true;
  if (custom[key] === false) return false;

  const profile = String(user?.profile || "user");
  return (ROLE_DEFAULTS[profile] || ROLE_DEFAULTS.user).includes(action);
};

export const assertKanbanPermission = (
  user: UserLike,
  action: KanbanAction
): void => {
  if (!userHasKanbanPermission(user, action)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
};

export default assertKanbanPermission;
