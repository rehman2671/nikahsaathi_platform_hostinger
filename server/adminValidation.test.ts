import { describe, expect, it } from "vitest";
import { normalizeAdminDomain, validateCommunityEligibility, validatePlanAdminConfirmation } from "./adminValidation";

describe("admin CRUD validation", () => {
  it("normalizes safe domains and rejects paths or invalid characters", () => {
    expect(normalizeAdminDomain(" HTTPS://Example.COM/path ")).toBe("example.com");
    expect(() => normalizeAdminDomain("not a domain")).toThrow();
  });

  it("requires a meaningful community eligibility rule", () => {
    expect(validateCommunityEligibility("Verified members in the selected category")).toContain("Verified");
    expect(() => validateCommunityEligibility("x")).toThrow();
  });

  it("requires the explicit plan administration confirmation", () => {
    expect(validatePlanAdminConfirmation(" confirm ")).toBe(true);
    expect(validatePlanAdminConfirmation("approve")).toBe(false);
  });
});
