export type CommunityStatus = "coming_soon" | "active" | "archived";

export function getCommunityPermissions(status: CommunityStatus | undefined, isModerator = false) {
  if (!status) return { canView: false, canPost: false, canComment: false, canMessage: false, canViewMembers: false, canModerate: false, readOnly: true, reason: "Community not found" } as const;
  if (status !== "active") return { canView: true, canPost: false, canComment: false, canMessage: false, canViewMembers: false, canModerate: false, readOnly: true, reason: "This community is not active yet." } as const;
  return { canView: true, canPost: true, canComment: true, canMessage: true, canViewMembers: true, canModerate: isModerator, readOnly: false, reason: null } as const;
}
