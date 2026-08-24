import { describe, expect, it } from "vitest";
import { listReviewCasesByType } from "./db";

describe("Telegram webhook secret", () => {
  it("rejects webhook POSTs without the configured secret", async () => {
    const response = await fetch("http://127.0.0.1:3000/api/telegram/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ update_id: 9001 }) });
    expect(response.status).toBe(401);
  });

  it("is accepted by the local webhook health boundary", async () => {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    expect(secret, "TELEGRAM_WEBHOOK_SECRET must be configured").toBeTruthy();
    const response = await fetch("http://127.0.0.1:3000/api/telegram/health", {
      headers: { "x-telegram-bot-api-secret-token": secret! },
    });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok?: boolean };
    expect(payload.ok).toBe(true);
  }, 15_000);

  it("persists a signed /action update as an agent-review handoff", async () => {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const operatorId = (process.env.TELEGRAM_OPERATOR_IDS ?? '').split(',')[0]?.trim();
    expect(secret).toBeTruthy();
    expect(operatorId).toBeTruthy();
    const response = await fetch("http://127.0.0.1:3000/api/telegram/webhook", { method: "POST", headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret!, "x-telegram-test-mode": "true" }, body: JSON.stringify({ update_id: Date.now(), message: { text: "/action permanent_ban 7", chat: { id: 1 }, from: { id: Number(operatorId) } } }) });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { handled?: boolean; handoffCaseId?: number };
    expect(payload.handled).toBe(true);
    expect(payload.handoffCaseId).toEqual(expect.any(Number));
    const cases = await listReviewCasesByType("agent_review");
    expect(cases.some(item => item.id === payload.handoffCaseId && item.source === "telegram")).toBe(true);
  }, 15_000);

  it("accepts a signed harmless update without creating a command", async () => {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    expect(secret).toBeTruthy();
    const response = await fetch("http://127.0.0.1:3000/api/telegram/webhook", { method: "POST", headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret! }, body: JSON.stringify({ update_id: 9002, message: { text: "hello", chat: { id: 1 }, from: { id: 999 } } }) });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ignored?: boolean };
    expect(payload.ignored).toBe(true);
  }, 15_000);
});
