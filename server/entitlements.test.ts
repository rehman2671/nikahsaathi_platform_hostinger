import { describe, expect, it } from "vitest";
import { projectProfile, resolveEffectivePlan } from "./entitlements";

const policies = [
  { fieldKey: "displayName", freeAccess: true, basicAccess: true, advancedAccess: true, requiresOwnerConsent: false, isSensitive: false },
  { fieldKey: "profession", freeAccess: false, basicAccess: true, advancedAccess: true, requiresOwnerConsent: true, isSensitive: false },
  { fieldKey: "phone", freeAccess: false, basicAccess: false, advancedAccess: false, requiresOwnerConsent: true, isSensitive: true },
  { fieldKey: "privatePhoto", freeAccess: false, basicAccess: true, advancedAccess: true, requiresOwnerConsent: true, isSensitive: true },
];

const profile = {
  displayName: "A profile",
  profession: "Designer",
  phone: "+911234567890",
  privatePhoto: "private-key",
};

describe("profile entitlements", () => {
  it("falls back to free when subscription is missing, cancelled or expired", () => {
    const now = new Date("2026-08-24T00:00:00.000Z");
    expect(resolveEffectivePlan(undefined, now)).toBe("free");
    expect(resolveEffectivePlan({ planCode: "advanced", status: "cancelled", endsAt: null }, now)).toBe("free");
    expect(resolveEffectivePlan({ planCode: "basic", status: "active", endsAt: new Date("2026-08-23T23:59:59.000Z") }, now)).toBe("free");
    expect(resolveEffectivePlan({ planCode: "basic", status: "active", endsAt: new Date("2026-08-24T00:00:01.000Z") }, now)).toBe("basic");
  });
  it("returns only fields allowed by the free plan", () => {
    expect(projectProfile(profile, policies, {
      plan: "free",
      ownerConsent: {},
      ownerPrivacy: {},
    })).toEqual({ displayName: "A profile" });
  });

  it("requires owner consent even for paid fields", () => {
    expect(projectProfile(profile, policies, {
      plan: "advanced",
      ownerConsent: { profession: true },
      ownerPrivacy: {},
    })).toEqual({ displayName: "A profile", profession: "Designer" });
  });

  it("honors an explicit privacy denial over a paid entitlement", () => {
    expect(projectProfile(profile, policies, {
      plan: "advanced",
      ownerConsent: { profession: true, privatePhoto: true },
      ownerPrivacy: { profession: false },
      relationshipState: "matched",
    })).toEqual({ displayName: "A profile", privatePhoto: "private-key" });
  });
});
