import { describe, expect, it } from "vitest";
import { canExecuteApprovedAction, requiresHumanApproval } from "./approvalPolicy";

describe("approval policy", () => {
  it("requires humans for sensitive actions and low confidence", () => {
    expect(requiresHumanApproval("permanent_ban", 0.99)).toBe(true);
    expect(requiresHumanApproval("content_block", 0.72)).toBe(true);
    expect(requiresHumanApproval("content_block", 0.92)).toBe(false);
  });

  it("requires an explicit second confirmation for high-risk execution", () => {
    expect(canExecuteApprovedAction({ action: "identity_disclose", confidence: 0.99, humanDecision: "approve" })).toBe(false);
    expect(canExecuteApprovedAction({ action: "identity_disclose", confidence: 0.99, humanDecision: "approve", secondConfirmation: "APPROVE" })).toBe(false);
    expect(canExecuteApprovedAction({ action: "identity_disclose", confidence: 0.99, humanDecision: "approve", secondConfirmation: "CONFIRM" })).toBe(true);
  });
});
