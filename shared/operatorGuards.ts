export const highRiskActions = ["content_allow", "content_block", "verification_approve", "verification_reject", "profile_reveal", "identity_disclose", "permanent_ban", "emergency_freeze", "refund", "rule_activate"] as const;
export type HighRiskAction = (typeof highRiskActions)[number];

export function requiresSecondConfirmation(action: HighRiskAction) {
  return highRiskActions.includes(action);
}

export function isValidSecondConfirmation(value: string) {
  return value.trim().toUpperCase() === "CONFIRM";
}
