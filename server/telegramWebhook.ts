import express, { type Express, type Request, type Response } from "express";
import { buildTelegramCommandResponse, parseTelegramCommand, redactTelegramText, telegramIntegrationStatus, verifyTelegramWebhookSecret } from "./telegramOps";
import { claimTelegramUpdate, completeTelegramUpdate, failTelegramUpdate, markTelegramMessageFailed, markTelegramMessageSent, stageTelegramHandoff } from "./db";
import { createRateLimiter } from "./_core/rateLimit";

const telegramWebhookRateLimiter = createRateLimiter({ windowMs: 60_000, max: 60, keyPrefix: "telegram-webhook" });

function webhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
}

function isAuthorized(request: Request) {
  return verifyTelegramWebhookSecret(String(request.header("x-telegram-bot-api-secret-token") ?? ""), webhookSecret());
}

async function sendTelegramMessage(chatId: string, text: string) {
  if (process.env.NODE_ENV === "development" && process.env.TELEGRAM_WEBHOOK_DRY_RUN === "true") return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: redactTelegramText(text), disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram sendMessage failed with ${response.status}`);
}

export function registerTelegramWebhookRoutes(app: Express) {
  app.get("/api/telegram/health", (request, response) => {
    if (!isAuthorized(request)) return response.status(401).json({ ok: false });
    return response.json({ ok: true, ...telegramIntegrationStatus(), webhook: true });
  });

  app.post("/api/telegram/webhook", telegramWebhookRateLimiter, express.json({ limit: "64kb" }), async (request, response) => {
    if (!isAuthorized(request)) return response.status(401).json({ ok: false });
    const update = request.body as { update_id?: number; message?: { text?: string; chat?: { id?: number }; from?: { id?: number } } };
    const updateId = update.update_id == null ? "" : String(update.update_id);
    const operatorId = update.message?.from?.id == null ? "" : String(update.message.from.id);
    const text = update.message?.text ?? "";
    const chatId = update.message?.chat?.id == null ? "" : String(update.message.chat.id);
    const command = parseTelegramCommand(text, operatorId);
    if (!updateId || !command || !chatId) return response.json({ ok: true, ignored: true });

    const claimed = await claimTelegramUpdate({ updateId, operatorId, command: text.slice(0, 160) });
    if (!claimed) return response.json({ ok: true, duplicate: true });

    try {
      const previewReply = buildTelegramCommandResponse(command);
      const staged = await stageTelegramHandoff({ updateId, operatorId, chatId, text: redactTelegramText(previewReply), command: command.kind, action: command.kind === "open_admin_action" ? command.action : undefined, caseId: command.kind === "open_admin_action" ? command.caseId : undefined });
      const handoffCaseId = staged.handoffCaseId;
      const reply = staged.text;
      const testDryRun = process.env.NODE_ENV === "development" && request.header("x-telegram-test-mode") === "true";
      if (!staged.alreadySent && !testDryRun) await sendTelegramMessage(chatId, reply);
      if (!staged.alreadySent) await markTelegramMessageSent(updateId);
      await completeTelegramUpdate(updateId);
      return response.json({ ok: true, handled: true, handoffCaseId, duplicateDeliveryPrevented: staged.alreadySent });
    } catch (error) {
      try { await markTelegramMessageFailed(updateId, error); } catch { /* receipt failure remains authoritative */ }
      await failTelegramUpdate(updateId, error);
      return response.status(500).json({ ok: false, retry: true });
    }
  });
}
