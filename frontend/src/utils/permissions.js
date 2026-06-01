import rules from "../rules";

const parseCustomPermissions = (user) => {
  const raw = user?.permissions;
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

/**
 * Verifica permissão estática (rules.js) + overrides em user.permissions.
 */
export const canPerform = (user, perform) => {
  if (!user || !perform) return false;
  if (user.super) return true;

  const custom = parseCustomPermissions(user);
  if (custom[perform] === true) return true;
  if (custom[perform] === false) return false;

  const role = user.profile || "user";
  const roleRules = rules[role];
  if (!roleRules?.static) return false;
  return roleRules.static.includes(perform);
};

export const getUiPreferences = (user) => {
  const raw = user?.uiPreferences;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  return raw;
};

export const isUiHidden = (user, key) => {
  const prefs = getUiPreferences(user);
  return prefs[key] === false || prefs[key] === "hidden";
};

export default canPerform;
