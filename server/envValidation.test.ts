import { describe, expect, it, afterEach, vi } from "vitest";
import { validateStartupConfiguration } from "./_core/env";

describe("startup configuration validation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does not require production secrets during local development", () => {
    expect(validateStartupConfiguration(false)).toEqual({ valid: true, missing: [] });
  });

  it("fails with a redacted list when required production configuration is missing", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("VITE_APP_ID", "");
    vi.stubEnv("OAUTH_SERVER_URL", "");
    vi.stubEnv("BUILT_IN_FORGE_API_URL", "");
    vi.stubEnv("BUILT_IN_FORGE_API_KEY", "");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    expect(() => validateStartupConfiguration(true)).toThrow(/DATABASE_URL/);
    expect(() => validateStartupConfiguration(true)).toThrow(/BUILT_IN_FORGE_API_KEY/);
  });

  it("requires Telegram operator and webhook settings when the bot is enabled", () => {
    for (const key of ["DATABASE_URL", "JWT_SECRET", "VITE_APP_ID", "OAUTH_SERVER_URL", "BUILT_IN_FORGE_API_URL", "BUILT_IN_FORGE_API_KEY"] as const) {
      vi.stubEnv(key, "configured");
    }
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "configured");
    vi.stubEnv("TELEGRAM_OPERATOR_IDS", "");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");
    expect(() => validateStartupConfiguration(true)).toThrow(/TELEGRAM_OPERATOR_IDS/);
    expect(() => validateStartupConfiguration(true)).toThrow(/TELEGRAM_WEBHOOK_SECRET/);
  });
});
