export type OperationalAction = "content_allow" | "content_block" | "verification_approve" | "verification_reject" | "profile_reveal" | "identity_disclose" | "permanent_ban" | "emergency_freeze" | "refund" | "rule_activate";

import { isValidSecondConfirmation } from "../shared/operatorGuards";

const highRiskActions = new Set<OperationalAction>([
  "verification_approve",
  "verification_reject",
  "profile_reveal",
  "identity_disclose",
  "permanent_ban",
  "emergency_freeze",
  "refund",
  "rule_activate",
]);

export function requiresHumanApproval(action: OperationalAction, confidence: number) {
  return highRiskActions.has(action) || confidence < 0.85;
}

export function canExecuteApprovedAction(input: { action: OperationalAction; confidence: number; humanDecision?: "approve" | "reject"; secondConfirmation?: string }) {
  if (!requiresHumanApproval(input.action, input.confidence)) return true;
  const confirmation = input.secondConfirmation;
  return input.humanDecision === "approve" && typeof confirmation === "string" && isValidSecondConfirmation(confirmation);
}
