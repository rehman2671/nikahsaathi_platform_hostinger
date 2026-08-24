import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramOperation = "notify" | "assign_review" | "request_verification" | "pause_agent" | "open_admin_action";

function configuredOperatorIds() {
  return new Set((process.env.TELEGRAM_OPERATOR_IDS ?? "").split(",").map(value => value.trim()).filter(Boolean));
}

export function isTelegramOperatorAllowed(operatorId: string) {
  return Boolean(operatorId) && configuredOperatorIds().has(operatorId);
}

export function redactTelegramText(input: string) {
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email hidden]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[number hidden]")
    .replace(/https?:\/\/[^\s]+/gi, "[link hidden]")
    .replace(/(?:address|location|upi|iban|account)\s*[:=-]?\s*[^,;.]+/gi, "[private detail hidden]");
}

export function buildRedactedTelegramNotification(input: { operation: TelegramOperation; caseId?: number; summary: string; severity?: string }) {
  const safeSummary = redactTelegramText(input.summary).slice(0, 700);
  const caseLabel = input.caseId ? `Case #${input.caseId}` : "Operations event";
  return `[NikahSaathi] ${caseLabel}\nOperation: ${input.operation}\nSeverity: ${input.severity ?? "unspecified"}\n${safeSummary}`;
}

export function verifyTelegramSignature(payload: string, signature: string, secret: string) {
  if (!payload || !signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export type TelegramQueue = "all" | "moderation" | "verification" | "support" | "incident" | "agent_review";
export type TelegramCommand =
  | { kind: "help" }
  | { kind: "queue"; queue: TelegramQueue }
  | { kind: "open_admin_action"; action: string; caseId: number };

export function parseTelegramCommand(text: string, operatorId: string): TelegramCommand | null {
  if (!isTelegramOperatorAllowed(operatorId)) return null;
  const tokens = text.trim().split(/\s+/);
  const command = (tokens[0] ?? "").toLowerCase().split("@")[0];
  if (command === "/help") return { kind: "help" };
  if (command === "/queue") {
    const queue = (tokens[1] ?? "all").toLowerCase();
    if (["all", "moderation", "verification", "support", "incident", "agent_review"].includes(queue)) return { kind: "queue", queue: queue as TelegramQueue };
    return null;
  }
  if (command === "/action" && tokens[1] && Number.isInteger(Number(tokens[2])) && Number(tokens[2]) > 0) {
    return { kind: "open_admin_action", action: tokens[1], caseId: Number(tokens[2]) };
  }
  return null;
}

export function buildTelegramCommandResponse(command: TelegramCommand) {
  if (command.kind === "help") return "NikahSaathi operations: /queue [all|moderation|verification|support|incident|agent_review] or /action <action> <caseId>. High-risk actions must be confirmed in the admin console.";
  if (command.kind === "queue") return `Queue requested: ${command.queue}. Detailed member data remains in the admin console.`;
  return `Action ${command.action} requested for Case #${command.caseId}. Open the admin console to review and confirm; no high-risk action executes in Telegram.`;
}

export function telegramIntegrationStatus() {
  return { configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_OPERATOR_IDS), operatorCount: configuredOperatorIds().size };
}
