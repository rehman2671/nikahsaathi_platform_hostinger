export const contentSurfaces = ["posts", "comments", "messages", "profiles"] as const;
export type ContentSurface = (typeof contentSurfaces)[number];

export const planCodes = ["free", "basic", "advanced"] as const;
export type PlanCode = (typeof planCodes)[number];

export const communityStatuses = ["coming_soon", "active", "archived"] as const;
export type CommunityStatus = (typeof communityStatuses)[number];

export type ContentSafetyRequest = {
  text: string;
  surface: ContentSurface;
};

export type ProfileProjectionRequest = {
  profile: Record<string, unknown>;
  plan: PlanCode;
  ownerConsent: Record<string, boolean | undefined>;
  ownerPrivacy: Record<string, boolean | undefined>;
  verificationState?: "unverified" | "pending" | "verified" | "expired";
  relationshipState?: "none" | "requested" | "matched" | "blocked";
};

export type ContentSafetyResponse = {
  allowed: boolean;
  action: string;
  highestRisk: string;
  maskedText: string | null;
  safeText: string | null;
  explanation: string | null;
  matches: Array<{ ruleId: number; name: string; ruleType: string; severity: string; action: string; matchedText: string }>;
  blockedUrls: string[];
};

export type CommunitySummary = {
  id: number;
  name: string;
  categoryType: "official" | "religion" | "country";
  status: CommunityStatus;
};
