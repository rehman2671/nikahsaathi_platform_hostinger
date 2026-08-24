import { describe, expect, it } from "vitest";
import { projectProfile } from "./entitlements";

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
