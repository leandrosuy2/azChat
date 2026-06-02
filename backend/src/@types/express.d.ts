declare namespace Express {
  export interface Request {
    user: {
      id: string;
      profile: string;
      companyId: number;
      super?: boolean;
      permissions?: Record<string, boolean> | string | null;
      uiPreferences?: Record<string, unknown> | string | null;
    };
  }
}
