import { describe, expect, it } from "vitest";
import { canJoinCommunity, getCommunityPermissions, parseCommunityEligibility } from "./communityPolicy";

describe("community permissions", () => {
  it("keeps Coming Soon communities read-only and hides member lists", () => {
    expect(getCommunityPermissions("coming_soon")).toMatchObject({ canView: true, readOnly: true, canPost: false, canMessage: false, canViewMembers: false, canModerate: false });
  });

  it("allows active community participation and scopes moderation to assigned moderators", () => {
    expect(getCommunityPermissions("active")).toMatchObject({ canView: true, readOnly: false, canPost: true, canComment: true, canMessage: true, canViewMembers: true, canModerate: false });
    expect(getCommunityPermissions("active", true).canModerate).toBe(true);
  });

  it("hides unknown communities", () => {
    expect(getCommunityPermissions(undefined)).toMatchObject({ canView: false, readOnly: true });
  });
});

describe("community eligibility", () => {
  it("requires verified profiles when configured", () => {
    const eligibility = parseCommunityEligibility(JSON.stringify({ requiresVerified: true }));
    expect(canJoinCommunity(eligibility, { verificationState: "pending" })).toBe(false);
    expect(canJoinCommunity(eligibility, { verificationState: "verified" })).toBe(true);
  });

  it("matches normalized religion and country values", () => {
    const eligibility = parseCommunityEligibility(JSON.stringify({ religions: ["Islam"], countries: ["India"] }));
    expect(canJoinCommunity(eligibility, { religion: "islam", country: "india" })).toBe(true);
    expect(canJoinCommunity(eligibility, { religion: "christian", country: "india" })).toBe(false);
  });
});
