import { describe, expect, it } from "vitest";

describe("Telegram credentials", () => {
  it("authenticate with Telegram getMe when configured", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    expect(token, "TELEGRAM_BOT_TOKEN must be configured").toBeTruthy();

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    expect(response.ok).toBe(true);
    const payload = (await response.json()) as { ok?: boolean };
    expect(payload.ok).toBe(true);
  }, 15_000);
});
