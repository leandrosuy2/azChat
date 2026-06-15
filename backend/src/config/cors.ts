const configuredOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true;

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  return process.env.NODE_ENV === "development" && localOriginPattern.test(origin);
};

export const corsOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Not allowed by CORS: ${origin}`), false);
};
