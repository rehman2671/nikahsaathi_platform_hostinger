import { describe, expect, it } from "vitest";
import { isValidSecondConfirmation, requiresSecondConfirmation } from "../shared/operatorGuards";

describe("operator confirmation guards", () => {
  it("requires confirmation for high-risk actions", () => {
    expect(requiresSecondConfirmation("permanent_ban")).toBe(true);
    expect(requiresSecondConfirmation("refund")).toBe(true);
  });

  it("accepts only an explicit typed confirmation", () => {
    expect(isValidSecondConfirmation("CONFIRM")).toBe(true);
    expect(isValidSecondConfirmation(" confirm ")).toBe(true);
    expect(isValidSecondConfirmation("yes")).toBe(false);
    expect(isValidSecondConfirmation("")).toBe(false);
  });
});
