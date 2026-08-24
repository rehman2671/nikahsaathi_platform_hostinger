export type CommunityStatus = "coming_soon" | "active" | "archived";

export function getCommunityPermissions(status: CommunityStatus | undefined, isModerator = false) {
  if (!status) return { canView: false, canPost: false, canComment: false, canMessage: false, canViewMembers: false, canModerate: false, readOnly: true, reason: "Community not found" } as const;
  if (status !== "active") return { canView: true, canPost: false, canComment: false, canMessage: false, canViewMembers: false, canModerate: false, readOnly: true, reason: "This community is not active yet." } as const;
  return { canView: true, canPost: true, canComment: true, canMessage: true, canViewMembers: true, canModerate: isModerator, readOnly: false, reason: null } as const;
}

export type CommunityEligibilityProfile = {
  verificationState?: "unverified" | "pending" | "verified" | "expired";
  religion?: string | null;
  country?: string | null;
};

export type ParsedCommunityEligibility = {
  requiresVerified?: boolean;
  religions?: string[];
  countries?: string[];
};

export function parseCommunityEligibility(raw: string | null | undefined): ParsedCommunityEligibility {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      requiresVerified: parsed.requiresVerified === true || parsed.verified === true,
      religions: Array.isArray(parsed.religions) ? parsed.religions.filter((value): value is string => typeof value === "string").map(value => value.trim().toLowerCase()).filter(Boolean) : undefined,
      countries: Array.isArray(parsed.countries) ? parsed.countries.filter((value): value is string => typeof value === "string").map(value => value.trim().toLowerCase()).filter(Boolean) : undefined,
    };
  } catch {
    const normalized = raw.toLowerCase();
    const religion = normalized.match(/religion\s*[:=]\s*([a-z -]+)/)?.[1]?.trim();
    const country = normalized.match(/country\s*[:=]\s*([a-z -]+)/)?.[1]?.trim();
    return {
      requiresVerified: /\bverified\b/.test(normalized),
      religions: religion ? [religion] : undefined,
      countries: country ? [country] : undefined,
    };
  }
}

export function canJoinCommunity(eligibility: ParsedCommunityEligibility, profile: CommunityEligibilityProfile | undefined) {
  if (eligibility.requiresVerified && profile?.verificationState !== "verified") return false;
  if (eligibility.religions?.length && !eligibility.religions.includes(profile?.religion?.trim().toLowerCase() ?? "")) return false;
  if (eligibility.countries?.length && !eligibility.countries.includes(profile?.country?.trim().toLowerCase() ?? "")) return false;
  return true;
}
