export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

const requiredProductionEnv = [
  "DATABASE_URL",
  "JWT_SECRET",
  "VITE_APP_ID",
  "OAUTH_SERVER_URL",
  "BUILT_IN_FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
] as const;

export function validateStartupConfiguration(isProduction = ENV.isProduction) {
  if (!isProduction) return { valid: true as const, missing: [] as string[] };
  const missing: string[] = requiredProductionEnv.filter(key => !process.env[key]?.trim());
  const telegramEnabled = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
  if (telegramEnabled) {
    for (const key of ["TELEGRAM_OPERATOR_IDS", "TELEGRAM_WEBHOOK_SECRET"] as const) {
      if (!process.env[key]?.trim()) missing.push(key);
    }
  }
  if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
  return { valid: true as const, missing };
}
