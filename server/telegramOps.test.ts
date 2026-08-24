import { describe, expect, it, vi } from "vitest";
import { buildRedactedTelegramNotification, buildTelegramCommandResponse, isTelegramOperatorAllowed, parseTelegramCommand, redactTelegramText, verifyTelegramSignature } from "./telegramOps";

describe("telegram operations safety", () => {
  it("redacts contact details and links from notifications", () => {
    const result = redactTelegramText("Email admin@example.com, call +91 98765 43210, visit https://example.com");
    expect(result).not.toContain("admin@example.com");
    expect(result).not.toContain("98765");
    expect(result).not.toContain("https://");
  });

  it("builds a bounded redacted notification", () => {
    const result = buildRedactedTelegramNotification({ operation: "notify", caseId: 12, severity: "high", summary: "A private location: Delhi and phone +1 555 123 4567" });
    expect(result).toContain("Case #12");
    expect(result).toContain("[private detail hidden]");
    expect(result).not.toContain("555 123 4567");
    expect(result.length).toBeLessThan(800);
  });

  it("uses an allowlist for operators", () => {
    vi.stubEnv("TELEGRAM_OPERATOR_IDS", "123,456");
    expect(isTelegramOperatorAllowed("123")).toBe(true);
    expect(isTelegramOperatorAllowed("999")).toBe(false);
    vi.unstubAllEnvs();
  });

  it("parses only allowlisted operator commands and keeps high-risk actions in the console", () => {
    vi.stubEnv("TELEGRAM_OPERATOR_IDS", "123,456");
    expect(parseTelegramCommand("/queue incident", "123")).toEqual({ kind: "queue", queue: "incident" });
    expect(parseTelegramCommand("/action emergency_freeze 42", "123")).toEqual({ kind: "open_admin_action", action: "emergency_freeze", caseId: 42 });
    expect(buildTelegramCommandResponse({ kind: "open_admin_action", action: "emergency_freeze", caseId: 42 })).toContain("no high-risk action executes in Telegram");
    expect(parseTelegramCommand("/queue incident", "999")).toBeNull();
    vi.unstubAllEnvs();
  });

  it("verifies signed callbacks without accepting altered payloads", () => {
    const payload = "case=12&action=notify";
    const crypto = require("node:crypto") as typeof import("node:crypto");
    const signature = crypto.createHmac("sha256", "secret").update(payload).digest("hex");
    expect(verifyTelegramSignature(payload, signature, "secret")).toBe(true);
    expect(verifyTelegramSignature(`${payload}&altered=1`, signature, "secret")).toBe(false);
  });
});
