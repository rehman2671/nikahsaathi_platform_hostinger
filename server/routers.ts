import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { applySafetyDecision, evaluateSafetyRules, findBlockedDomains } from "./safetyEngine";
import { projectProfile, resolveEffectivePlan } from "./entitlements";
import { canExecuteApprovedAction } from "./approvalPolicy";
import { getCommunityPermissions } from "./communityPolicy";
import { telegramIntegrationStatus } from "./telegramOps";
import { normalizeAdminDomain, validateCommunityEligibility } from "./adminValidation";
import {
  createAuditLog,
  createCommunity,
  assignCommunityModerator,
  createBlockedDomain,
  updateBlockedDomain,
  createReviewCase,
  updateReviewCase,
  listSupportTickets,
  listIncidentRecords,
  updateSupportTicket,
  updateIncidentRecord,
  createSupportTicket,
  createIncidentRecord,
  createAgentDecision,
  getVerificationDetail,
  upsertVerificationDetail,
  listReviewCaseEvidence,
  addReviewCaseEvidence,
  createSafetyRule,
  createSafetyRuleVersion,
  updateSafetyRule,
  getEffectiveSubscription,
  getOperationsCounts,
  joinCommunity,
  leaveCommunity,
  listCommunities,
  canUserJoinCommunity,
  listCommunityModerators,
  listCommunityMembers,
  listAuditLogs,
  listBlockedDomains,
  setBlockedDomainStatus,
  listProfileFieldPolicies,
  listReviewCases,
  listReviewCasesByType,
  listSafetyRules,
  listUserMemberships,
  getCommunityModeratorPreview,
  getSubscriptionEntitlementPreview,
  listSubscriptionPlans,
  updateSubscriptionPlan,
  changeUserSubscription,
  createMediaAsset,
  createPost,
  createComment,
  getPost,
  listCommunityPosts,
  listPostComments,
  isActiveCommunityMember,
  recordHumanReview,
  rollbackSafetyRule,
  setCommunityStatus,
  updateCommunity,
  removeCommunityModerator,
  setSafetyRuleStatus,
  updateProfileFieldPolicy,
  getUserProfile,
  upsertUserProfile,
  listUserInterests,
  replaceUserInterests,
  listDiscoverableProfiles,
  upsertMatchRequest,
  listUserMatches,
  getRelationshipState,
  transitionMatch,
  linkProfilePhoto,
  listProfilePhotos,
  listVisibleProfilePhotos,
  openConversation,
  listUserConversations,
  createMessage,
  listConversationMessages,
  setUserBlock,
  revokeUserBlock,
  createUserReport,
  submitVerification,
  listVerificationSubmissions,
} from "./db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access is required" });
  }
  return next();
});

const contentInput = z.object({ body: z.string().trim().min(1).max(5000) });

type MutationBucket = { startedAt: number; count: number };
const mutationBuckets = new Map<string, MutationBucket>();
function enforceMutationRateLimit(userId: number, operation: string, max: number, windowMs: number) {
  const now = Date.now();
  const key = `${operation}:${userId}`;
  const current = mutationBuckets.get(key);
  const bucket = !current || now - current.startedAt >= windowMs ? { startedAt: now, count: 0 } : current;
  bucket.count += 1;
  mutationBuckets.set(key, bucket);
  if (mutationBuckets.size > 10000) {
    mutationBuckets.forEach((item, itemKey) => { if (now - item.startedAt >= windowMs) mutationBuckets.delete(itemKey); });
  }
  if (bucket.count > max) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests; try again later" });
}

const profileInput = z.object({
  displayName: z.string().trim().min(1).max(160).optional(),
  introduction: z.string().trim().max(5000).optional(),
  religion: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  city: z.string().trim().max(120).optional(),
  profession: z.string().trim().max(160).optional(),
  education: z.string().trim().max(200).optional(),
  languages: z.string().trim().max(255).optional(),
  marriageExpectations: z.string().trim().max(5000).optional(),
  ownerConsent: z.record(z.string(), z.boolean()).optional(),
  ownerPrivacy: z.record(z.string(), z.boolean()).optional(),
  profileStatus: z.enum(["draft", "pending_review"]).optional(),
});

const ruleInput = z.object({
  name: z.string().min(2).max(160),
  ruleType: z.enum(["bad_word", "phone_number", "link_domain", "spam", "personal_data", "threat", "scam"]),
  pattern: z.string().min(1).max(10000),
  scope: z.string().min(1).max(120).default("posts,comments,messages,profiles"),
  language: z.string().min(1).max(32).default("all"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  action: z.enum(["allow", "warn", "mask", "replace", "block", "quarantine", "rate_limit", "create_case", "escalate_human"]).default("block"),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  matrimony: router({
    myInterests: protectedProcedure.query(({ ctx }) => listUserInterests(ctx.user.id)),
    replaceMyInterests: protectedProcedure.input(z.object({ interestKeys: z.array(z.string().trim().min(1).max(80)).max(50) })).mutation(async ({ input, ctx }) => ({ interestKeys: await replaceUserInterests(ctx.user.id, input.interestKeys) })),
    discoverProfiles: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).default(30) }))
      .query(async ({ input, ctx }) => {
        const [subscription, policies, candidates] = await Promise.all([
          getEffectiveSubscription(ctx.user.id),
          listProfileFieldPolicies(),
          listDiscoverableProfiles(ctx.user.id, input.limit),
        ]);
        const plan = resolveEffectivePlan(subscription);
        const parseRecord = (value: string | null) => {
          try { return value ? JSON.parse(value) as Record<string, boolean | undefined> : {}; } catch { return {}; }
        };
        const visiblePhotos = await Promise.all(candidates.map(profile => listVisibleProfilePhotos(ctx.user.id, profile.userId)));
        return {
          plan,
          profiles: candidates.map((profile, index) => ({
            userId: profile.userId,
            photos: visiblePhotos[index],
            profile: projectProfile(
              { ...profile, ownerConsent: undefined, ownerPrivacy: undefined },
              policies,
              {
                plan,
                ownerConsent: parseRecord(profile.ownerConsent),
                ownerPrivacy: parseRecord(profile.ownerPrivacy),
                verificationState: profile.verificationState,
                relationshipState: "none",
              },
            ),
          })),
        };
      }),
    requestMatch: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ input, ctx }) => ({ matchId: await upsertMatchRequest(ctx.user.id, input.userId) })),
    myMatches: protectedProcedure.query(({ ctx }) => listUserMatches(ctx.user.id)),
    acceptMatch: protectedProcedure.input(z.object({ matchId: z.number().int().positive() })).mutation(async ({ input, ctx }) => ({ status: await transitionMatch(ctx.user.id, input.matchId, "accept") })),
    rejectMatch: protectedProcedure.input(z.object({ matchId: z.number().int().positive() })).mutation(async ({ input, ctx }) => ({ status: await transitionMatch(ctx.user.id, input.matchId, "reject") })),
    linkProfilePhoto: protectedProcedure.input(z.object({ mediaAssetId: z.number().int().positive(), sortOrder: z.number().int().min(0).max(100).default(0), isPrimary: z.boolean().default(false) })).mutation(async ({ input, ctx }) => ({ photoId: await linkProfilePhoto(ctx.user.id, input.mediaAssetId, input.sortOrder, input.isPrimary) })),
    myProfilePhotos: protectedProcedure.query(({ ctx }) => listProfilePhotos(ctx.user.id)),
    openConversation: protectedProcedure.input(z.object({ userId: z.number().int().positive(), identityMode: z.enum(["hidden", "profile_visible"]).default("hidden") })).mutation(async ({ input, ctx }) => ({ conversationId: await openConversation(ctx.user.id, input.userId, input.identityMode) })),
    myConversations: protectedProcedure.query(({ ctx }) => listUserConversations(ctx.user.id)),
    conversationMessages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ input, ctx }) => listConversationMessages(ctx.user.id, input.conversationId)),
    sendMessage: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), body: z.string().trim().min(1).max(5000) })).mutation(async ({ input, ctx }) => {
      const [rules, domains] = await Promise.all([listSafetyRules(), listBlockedDomains()]);
      const matches = evaluateSafetyRules(input.body, "messages", rules);
      const blockedUrls = findBlockedDomains(input.body, domains.filter(domain => domain.isActive).map(domain => domain.domain));
      const decision = applySafetyDecision(input.body, matches, blockedUrls);
      if (!decision.allowed) throw new TRPCError({ code: "BAD_REQUEST", message: decision.explanation ?? "This message cannot be sent" });
      const messageId = await createMessage(ctx.user.id, input.conversationId, decision.safeText ?? input.body, "published");
      return { messageId, safety: { action: decision.action, maskedText: decision.safeText, highestRisk: matches[0]?.severity ?? (blockedUrls.length ? "high" : "low") } };
    }),
    blockUser: protectedProcedure.input(z.object({ userId: z.number().int().positive(), reason: z.string().trim().max(200).optional() })).mutation(async ({ input, ctx }) => ({ blockId: await setUserBlock(ctx.user.id, input.userId, input.reason) })),
    unblockUser: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ input, ctx }) => { await revokeUserBlock(ctx.user.id, input.userId); return { success: true } as const; }),
    reportUser: protectedProcedure.input(z.object({ userId: z.number().int().positive(), reportType: z.enum(["harassment", "scam", "impersonation", "unsafe_behavior", "spam", "other"]), details: z.string().trim().max(4000).optional() })).mutation(({ input, ctx }) => { enforceMutationRateLimit(ctx.user.id, "user-report", 10, 10 * 60 * 1000); return createUserReport({ reporterUserId: ctx.user.id, reportedUserId: input.userId, reportType: input.reportType, details: input.details }); }),
    submitVerification: protectedProcedure.input(z.object({ provider: z.string().trim().min(2).max(120).default("manual"), evidenceAssetId: z.number().int().positive().optional() })).mutation(({ input, ctx }) => submitVerification({ userId: ctx.user.id, provider: input.provider, evidenceAssetId: input.evidenceAssetId })),
    myVerificationSubmissions: protectedProcedure.query(({ ctx }) => listVerificationSubmissions(ctx.user.id)),
  }),
  operations: router({
    accessCheck: adminProcedure.query(() => ({ allowed: true as const })),
    myProfile: protectedProcedure.query(({ ctx }) => getUserProfile(ctx.user.id)),
    profileByUserId: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ input, ctx }) => {
      const profile = await getUserProfile(input.userId);
      if (!profile) return undefined;
      if (input.userId === ctx.user.id) return { plan: "owner" as const, profile, photos: await listVisibleProfilePhotos(ctx.user.id, input.userId) };
      const [subscription, policies] = await Promise.all([getEffectiveSubscription(ctx.user.id), listProfileFieldPolicies()]);
      const parseRecord = (value: string | null) => {
        try { return value ? JSON.parse(value) as Record<string, boolean | undefined> : {}; } catch { return {}; }
      };
      const projected = projectProfile({ ...profile, ownerConsent: undefined, ownerPrivacy: undefined }, policies, {
        plan: resolveEffectivePlan(subscription),
        ownerConsent: parseRecord(profile.ownerConsent),
        ownerPrivacy: parseRecord(profile.ownerPrivacy),
        verificationState: profile.verificationState,
        relationshipState: await getRelationshipState(ctx.user.id, input.userId),
      });
      return { plan: resolveEffectivePlan(subscription), profile: projected, photos: await listVisibleProfilePhotos(ctx.user.id, input.userId) };
    }),
    registerMediaAsset: protectedProcedure.input(z.object({ storageKey: z.string().trim().min(1).max(1000), purpose: z.enum(["profile_photo", "verification_evidence", "incident_evidence", "other"]), visibility: z.enum(["public", "owner_only", "restricted"]).default("owner_only") })).mutation(async ({ input, ctx }) => {
      if (input.purpose === "incident_evidence" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only operators can register incident evidence" });
      if (input.purpose === "verification_evidence" && input.visibility !== "restricted") throw new TRPCError({ code: "BAD_REQUEST", message: "Verification evidence must remain restricted" });
      if (input.purpose !== "profile_photo" && input.visibility === "public") throw new TRPCError({ code: "BAD_REQUEST", message: "Operational evidence cannot be public" });
      const id = await createMediaAsset({ ownerUserId: ctx.user.id, storageKey: input.storageKey, purpose: input.purpose, visibility: input.visibility, status: "active" });
      await createAuditLog({ actorType: "user", actorId: ctx.user.id, action: "media.register", resourceType: "media_asset", resourceId: id, metadata: JSON.stringify({ purpose: input.purpose, visibility: input.visibility }) });
      return { id } as const;
    }),
    communityPosts: protectedProcedure.input(z.object({ communityId: z.number().int().positive() })).query(({ input }) => listCommunityPosts(input.communityId)),
    postComments: protectedProcedure.input(z.object({ postId: z.number().int().positive() })).query(({ input }) => listPostComments(input.postId)),
    createPost: protectedProcedure.input(contentInput.extend({ communityId: z.number().int().positive().optional() })).mutation(async ({ input, ctx }) => {
      if (input.communityId && !(await isActiveCommunityMember(input.communityId, ctx.user.id))) throw new TRPCError({ code: "FORBIDDEN", message: "Join the active community before posting" });
      const [rules, domains] = await Promise.all([listSafetyRules(), listBlockedDomains()]);
      const matches = evaluateSafetyRules(input.body, "posts", rules);
      const blockedUrls = findBlockedDomains(input.body, domains.filter(domain => domain.isActive).map(domain => domain.domain));
      const decision = applySafetyDecision(input.body, matches, blockedUrls);
      if (!decision.allowed) throw new TRPCError({ code: "BAD_REQUEST", message: decision.explanation ?? "This post cannot be shared" });
      const postId = await createPost({ authorId: ctx.user.id, communityId: input.communityId, body: decision.safeText ?? input.body, status: "published" });
      await createAuditLog({ actorType: "user", actorId: ctx.user.id, action: "post.create", resourceType: "post", resourceId: postId, metadata: JSON.stringify({ communityId: input.communityId, safetyAction: decision.action }) });
      return { postId, safety: { action: decision.action, maskedText: decision.safeText, highestRisk: matches[0]?.severity ?? (blockedUrls.length ? "high" : "low") } };
    }),
    createComment: protectedProcedure.input(contentInput.extend({ postId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const post = await getPost(input.postId);
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      if (post.communityId && !(await isActiveCommunityMember(post.communityId, ctx.user.id))) throw new TRPCError({ code: "FORBIDDEN", message: "Join the active community before commenting" });
      const [rules, domains] = await Promise.all([listSafetyRules(), listBlockedDomains()]);
      const matches = evaluateSafetyRules(input.body, "comments", rules);
      const blockedUrls = findBlockedDomains(input.body, domains.filter(domain => domain.isActive).map(domain => domain.domain));
      const decision = applySafetyDecision(input.body, matches, blockedUrls);
      if (!decision.allowed) throw new TRPCError({ code: "BAD_REQUEST", message: decision.explanation ?? "This comment cannot be shared" });
      const commentId = await createComment({ postId: input.postId, authorId: ctx.user.id, body: decision.safeText ?? input.body, status: "published" });
      await createAuditLog({ actorType: "user", actorId: ctx.user.id, action: "comment.create", resourceType: "comment", resourceId: commentId, metadata: JSON.stringify({ postId: input.postId, safetyAction: decision.action }) });
      return { commentId, safety: { action: decision.action, maskedText: decision.safeText, highestRisk: matches[0]?.severity ?? (blockedUrls.length ? "high" : "low") } };
    }),
    upsertMyProfile: protectedProcedure.input(profileInput).mutation(async ({ input, ctx }) => {
      const [rules, domains] = await Promise.all([listSafetyRules(), listBlockedDomains()]);
      const textFields = ["displayName", "introduction", "religion", "country", "city", "profession", "education", "languages", "marriageExpectations"] as const;
      const safeValues: Record<string, unknown> = {};
      for (const field of textFields) {
        const value = input[field];
        if (value === undefined) continue;
        const matches = evaluateSafetyRules(value, "profiles", rules);
        const blockedUrls = findBlockedDomains(value, domains.filter(domain => domain.isActive).map(domain => domain.domain));
        const decision = applySafetyDecision(value, matches, blockedUrls);
        if (!decision.allowed) throw new TRPCError({ code: "BAD_REQUEST", message: decision.explanation ?? "This profile content cannot be shared" });
        safeValues[field] = decision.safeText ?? value;
        if (decision.action !== "allow") await createAuditLog({ actorType: "user", actorId: ctx.user.id, action: "profile.content_sanitized", resourceType: "profile", metadata: JSON.stringify({ field, action: decision.action }) });
      }
      if (input.ownerConsent) safeValues.ownerConsent = JSON.stringify(input.ownerConsent);
      if (input.ownerPrivacy) safeValues.ownerPrivacy = JSON.stringify(input.ownerPrivacy);
      if (input.profileStatus) safeValues.profileStatus = input.profileStatus;
      const profileId = await upsertUserProfile(ctx.user.id, safeValues);
      return { profileId, profile: await getUserProfile(ctx.user.id) };
    }),
    auditLogs: adminProcedure.query(() => listAuditLogs()),
    telegramStatus: adminProcedure.query(() => telegramIntegrationStatus()),
    authorizeHighRiskAction: adminProcedure
      .input(z.object({ action: z.enum(["content_allow", "content_block", "verification_approve", "verification_reject", "profile_reveal", "identity_disclose", "permanent_ban", "emergency_freeze", "refund", "rule_activate"]), confidence: z.number().min(0).max(1), humanDecision: z.enum(["approve", "reject"]).optional(), secondConfirmation: z.string().optional() }))
      .mutation(async ({ input, ctx }) => { const allowed = canExecuteApprovedAction(input); if (allowed) await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "high_risk.approved", resourceType: "operational_action", metadata: JSON.stringify({ action: input.action, confidence: input.confidence }) }); return { allowed } as const; }),
    overview: adminProcedure.query(() => getOperationsCounts()),
    safetyRules: adminProcedure.query(() => listSafetyRules()),
    testSafetyRule: adminProcedure
      .input(z.object({ text: z.string().min(1).max(5000), surface: z.enum(["posts", "comments", "messages", "profiles"]) }))
      .query(async ({ input }) => evaluateSafetyRules(input.text, input.surface, await listSafetyRules())),
    contentSafetyCheck: protectedProcedure
      .input(z.object({ text: z.string().min(1).max(5000), surface: z.enum(["posts", "comments", "messages", "profiles"]) }))
      .query(async ({ input }) => {
        const [rules, domains] = await Promise.all([listSafetyRules(), listBlockedDomains()]);
        const matches = evaluateSafetyRules(input.text, input.surface, rules);
        const blockedUrls = findBlockedDomains(input.text, domains.filter(domain => domain.isActive).map(domain => domain.domain));
        const decision = applySafetyDecision(input.text, matches, blockedUrls);
        return { ...decision, matches, blockedUrls, highestRisk: matches[0]?.severity ?? (blockedUrls.length ? "high" : "low"), maskedText: decision.safeText };
      }),
    createSafetyRule: adminProcedure.input(ruleInput).mutation(({ input, ctx }) =>
      createSafetyRule({ ...input, createdBy: ctx.user.id }),
    ),
    updateSafetyRule: adminProcedure.input(ruleInput.partial().extend({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => { const { id, ...changes } = input; await updateSafetyRule(id, changes); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "safety_rule.update", resourceType: "safety_rule", resourceId: id }); return { success: true } as const; }),
    setSafetyRuleStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        await setSafetyRuleStatus(input.id, input.isActive);
        await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: input.isActive ? "safety_rule.activate" : "safety_rule.deactivate", resourceType: "safety_rule", resourceId: input.id });
        return { success: true } as const;
      }),
    createSafetyRuleVersion: adminProcedure
      .input(z.object({ ruleId: z.number().int().positive(), version: z.number().int().positive(), pattern: z.string().min(1), action: z.string().min(1), changeReason: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        await createSafetyRuleVersion({ ...input, changedBy: ctx.user.id });
        await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "safety_rule.version_create", resourceType: "safety_rule", resourceId: input.ruleId, metadata: JSON.stringify({ version: input.version }) });
        return { success: true } as const;
      }),
    rollbackSafetyRule: adminProcedure
      .input(z.object({ ruleId: z.number().int().positive(), version: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await rollbackSafetyRule(input.ruleId, input.version, ctx.user.id);
        return { success: true } as const;
      }),
    blockedDomains: adminProcedure.query(() => listBlockedDomains()),
    createBlockedDomain: adminProcedure.input(z.object({ domain: z.string().min(3).max(255).regex(/^[a-z0-9.-]+$/i), reason: z.string().max(500).optional(), severity: z.enum(["low", "medium", "high", "critical"]).default("high") })).mutation(async ({ input, ctx }) => { const id = await createBlockedDomain({ ...input, domain: normalizeAdminDomain(input.domain), createdBy: ctx.user.id, isActive: true }); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "blocked_domain.create", resourceType: "blocked_domain", resourceId: id }); return { id } as const; }),
    setBlockedDomainStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ input, ctx }) => { await setBlockedDomainStatus(input.id, input.isActive); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: input.isActive ? "blocked_domain.activate" : "blocked_domain.deactivate", resourceType: "blocked_domain", resourceId: input.id }); return { success: true } as const; }),
    updateBlockedDomain: adminProcedure.input(z.object({ id: z.number().int().positive(), severity: z.enum(["low", "medium", "high", "critical"]).optional(), reason: z.string().max(500).optional() })).mutation(async ({ input, ctx }) => { const { id, ...changes } = input; await updateBlockedDomain(id, { ...changes, reason: changes.reason?.trim() }, ctx.user.id); return { success: true } as const; }),
    communities: adminProcedure.query(() => listCommunities()),
    availableCommunities: protectedProcedure.query(async ({ ctx }) => { const communities = await listCommunities(); return Promise.all(communities.map(async community => ({ ...community, canJoin: await canUserJoinCommunity(community.id, ctx.user.id) }))); }),
    createCommunity: adminProcedure
      .input(z.object({
        name: z.string().min(2).max(160),
        categoryType: z.enum(["official", "religion", "country"]),
        status: z.enum(["coming_soon", "active", "archived"]).default("coming_soon"),
        description: z.string().max(2000).optional(),
        eligibility: z.string().max(2000).optional(),
      }))
      .mutation(({ input, ctx }) => createCommunity({ ...input, createdBy: ctx.user.id })),
    updateCommunity: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).max(160).optional(), categoryType: z.enum(["official", "religion", "country"]).optional(), description: z.string().max(2000).optional(), eligibility: z.string().max(2000).optional() })).mutation(async ({ input, ctx }) => { const { id, ...changes } = input; await updateCommunity(id, { ...changes, eligibility: changes.eligibility ? validateCommunityEligibility(changes.eligibility) : changes.eligibility }); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "community.update", resourceType: "community", resourceId: id }); return { success: true } as const; }),
    setCommunityStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["coming_soon", "active", "archived"]) }))
      .mutation(async ({ input, ctx }) => {
        await setCommunityStatus(input.id, input.status);
        await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "community.status_change", resourceType: "community", resourceId: input.id, metadata: JSON.stringify({ status: input.status }) });
        return { success: true } as const;
      }),
    communityAccess: protectedProcedure
      .input(z.object({ communityId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => { const community = (await listCommunities()).find(item => item.id === input.communityId); const moderators = await listCommunityModerators(input.communityId); return getCommunityPermissions(community?.status, moderators.some(item => item.userId === ctx.user.id)); }),
    communityMembers: protectedProcedure
      .input(z.object({ communityId: z.number().int().positive() }))
      .query(async ({ input }) => { const community = (await listCommunities()).find(item => item.id === input.communityId); if (community?.status !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "Member lists are unavailable until this community is active" }); return listCommunityMembers(input.communityId); }),
    communityModerators: adminProcedure.input(z.object({ communityId: z.number().int().positive() })).query(({ input }) => listCommunityModerators(input.communityId)),
    communityModeratorPreview: adminProcedure.input(z.object({ communityId: z.number().int().positive(), userId: z.number().int().positive() })).query(({ input }) => getCommunityModeratorPreview(input.communityId, input.userId)),
    assignCommunityModerator: adminProcedure.input(z.object({ communityId: z.number().int().positive(), userId: z.number().int().positive() })).mutation(async ({ input, ctx }) => { const id = await assignCommunityModerator(input.communityId, input.userId, ctx.user.id); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "community.moderator_assign", resourceType: "community", resourceId: input.communityId, metadata: JSON.stringify({ userId: input.userId }) }); return { id } as const; }),
    removeCommunityModerator: adminProcedure.input(z.object({ id: z.number().int().positive(), communityId: z.number().int().positive() })).mutation(async ({ input, ctx }) => { await removeCommunityModerator(input.id, ctx.user.id); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "community.moderator_remove", resourceType: "community", resourceId: input.communityId, metadata: JSON.stringify({ moderatorId: input.id }) }); return { success: true } as const; }),
    myMemberships: protectedProcedure.query(({ ctx }) => listUserMemberships(ctx.user.id)),
    joinCommunity: protectedProcedure
      .input(z.object({ communityId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => ({ membershipId: await joinCommunity(input.communityId, ctx.user.id) })),
    leaveCommunity: protectedProcedure
      .input(z.object({ communityId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => { await leaveCommunity(input.communityId, ctx.user.id); return { success: true } as const; }),
    createHumanReviewCase: adminProcedure
      .input(z.object({ caseType: z.enum(["moderation", "verification", "support", "incident", "agent_review"]), severity: z.enum(["low", "medium", "high", "critical"]), summary: z.string().min(1).max(2000), subjectType: z.string().max(40).optional(), subjectId: z.number().int().positive().optional(), source: z.string().max(40).default("agent") }))
      .mutation(async ({ input, ctx }) => { enforceMutationRateLimit(ctx.user.id, "review-case", 30, 10 * 60 * 1000); return { caseId: await createReviewCase({ ...input, assignedTo: null }) }; }),
    completeHumanReview: adminProcedure
      .input(z.object({ caseId: z.number().int().positive(), decision: z.string().min(1).max(60), reasonCode: z.string().min(1).max(80), notes: z.string().max(4000).optional() }))
      .mutation(async ({ input, ctx }) => { await recordHumanReview({ ...input, reviewerId: ctx.user.id }); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "human_review.complete", resourceType: "review_case", resourceId: input.caseId, metadata: JSON.stringify({ decision: input.decision, reasonCode: input.reasonCode }) }); return { success: true } as const; }),
    verificationDetail: adminProcedure.input(z.object({ caseId: z.number().int().positive() })).query(({ input }) => getVerificationDetail(input.caseId)),
    reviewCaseEvidence: adminProcedure.input(z.object({ caseId: z.number().int().positive() })).query(({ input }) => listReviewCaseEvidence(input.caseId)),
    addReviewCaseEvidence: adminProcedure.input(z.object({ caseId: z.number().int().positive(), evidenceType: z.string().min(2).max(60), evidenceReference: z.string().min(3).max(1000), source: z.string().max(80).default("operations"), redactionState: z.enum(["redacted", "restricted"]).default("redacted") })).mutation(async ({ input, ctx }) => { const id = await addReviewCaseEvidence({ ...input, addedBy: ctx.user.id }); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "review_case.evidence_added", resourceType: "review_case", resourceId: input.caseId, metadata: JSON.stringify({ evidenceId: id, evidenceType: input.evidenceType, redactionState: input.redactionState }) }); return { id } as const; }),
    verificationAction: adminProcedure.input(z.object({ caseId: z.number().int().positive(), action: z.enum(["resubmit", "fallback_provider", "appeal"]), reason: z.string().min(3).max(500), fallbackProvider: z.string().max(120).optional(), fallbackOutcome: z.string().max(2000).optional(), appealNotes: z.string().max(4000).optional() }).superRefine((input, ctx) => { if (input.action === "fallback_provider" && (!input.fallbackProvider?.trim() || !input.fallbackOutcome?.trim())) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fallback provider and outcome are required" }); if (input.action === "appeal" && !input.appealNotes?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Appeal notes are required" }); })).mutation(async ({ input, ctx }) => { const status = input.action === "appeal" ? "appealed" : input.action === "fallback_provider" ? "escalated" : "open"; await updateReviewCase(input.caseId, { status }); await upsertVerificationDetail({ caseId: input.caseId, resubmissionReason: input.action === "resubmit" ? input.reason : undefined, fallbackProvider: input.fallbackProvider, fallbackOutcome: input.fallbackOutcome, appealNotes: input.action === "appeal" ? input.appealNotes ?? input.reason : input.appealNotes }); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: `verification.${input.action}`, resourceType: "review_case", resourceId: input.caseId, metadata: JSON.stringify({ reason: input.reason, fallbackProvider: input.fallbackProvider }) }); return { success: true, status } as const; }),
    reviewCases: adminProcedure.query(() => listReviewCases()),
    supportTickets: adminProcedure.query(() => listSupportTickets()),
    incidents: adminProcedure.query(() => listIncidentRecords()),
    updateReviewCase: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "assigned", "escalated", "resolved", "appealed"]).optional(), assignedTo: z.number().int().positive().nullable().optional(), severity: z.enum(["low", "medium", "high", "critical"]).optional(), summary: z.string().min(1).max(2000).optional() })).mutation(async ({ input, ctx }) => { const { id, ...changes } = input; await updateReviewCase(id, changes); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "review_case.update", resourceType: "review_case", resourceId: id, metadata: JSON.stringify(changes) }); return { success: true } as const; }),
    assignReviewCase: adminProcedure.input(z.object({ id: z.number().int().positive(), assignedTo: z.number().int().positive() })).mutation(async ({ input, ctx }) => { await updateReviewCase(input.id, { assignedTo: input.assignedTo, status: "assigned" }); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "review_case.assign", resourceType: "review_case", resourceId: input.id, metadata: JSON.stringify({ assignedTo: input.assignedTo }) }); return { success: true } as const; }),
    escalateReviewCase: adminProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().min(3).max(500) })).mutation(async ({ input, ctx }) => { await updateReviewCase(input.id, { status: "escalated" }); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "review_case.escalate", resourceType: "review_case", resourceId: input.id, metadata: JSON.stringify({ reason: input.reason }) }); return { success: true } as const; }),
    moderationQueue: adminProcedure.query(() => listReviewCasesByType("moderation")),
    verificationQueue: adminProcedure.query(() => listReviewCasesByType("verification")),
    supportQueue: adminProcedure.query(() => listReviewCasesByType("support")),
    incidentQueue: adminProcedure.query(() => listReviewCasesByType("incident")),
    agentReviewQueue: adminProcedure.query(() => listReviewCasesByType("agent_review")),
    persistAgentDecision: adminProcedure.input(z.object({ agentType: z.string().min(2).max(80), caseId: z.number().int().positive().optional(), recommendation: z.string().min(2).max(80), confidence: z.number().min(0).max(1), modelVersion: z.string().max(80).optional(), requiresHuman: z.boolean().default(true), summary: z.string().min(3).max(2000) })).mutation(async ({ input, ctx }) => { enforceMutationRateLimit(ctx.user.id, "agent-review", 30, 10 * 60 * 1000); const decisionId = await createAgentDecision({ agentType: input.agentType, caseId: input.caseId, recommendation: input.recommendation, confidence: String(input.confidence), modelVersion: input.modelVersion, requiresHuman: input.requiresHuman, persistedToReview: input.requiresHuman }); const caseId = input.requiresHuman && !input.caseId ? await createReviewCase({ caseType: "agent_review", severity: input.confidence < 0.5 ? "critical" : "high", summary: input.summary, source: input.agentType, assignedTo: null }) : input.caseId; await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "agent_decision.persist", resourceType: "agent_decision", resourceId: decisionId, metadata: JSON.stringify({ caseId, requiresHuman: input.requiresHuman }) }); return { decisionId, caseId } as const; }),
    createSupportTicket: adminProcedure.input(z.object({ category: z.string().min(2).max(80), priority: z.enum(["normal", "high", "urgent"]).default("normal"), summary: z.string().min(3).max(2000), assignedTo: z.number().int().positive().nullable().optional(), slaDueAt: z.coerce.date().optional() })).mutation(async ({ input, ctx }) => { if (input.slaDueAt && input.slaDueAt.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "SLA due time must be in the future" }); const id = await createSupportTicket({ ...input, status: input.assignedTo ? "assigned" : "open", assignedTo: input.assignedTo ?? null }); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "support_ticket.create", resourceType: "support_ticket", resourceId: id }); return { id } as const; }),
    createIncident: adminProcedure.input(z.object({ incidentType: z.string().min(2).max(80), severity: z.enum(["low", "medium", "high", "critical"]).default("high"), summary: z.string().min(3).max(2000), evidenceReference: z.string().max(1000).optional() })).mutation(async ({ input, ctx }) => { const id = await createIncidentRecord({ ...input, status: "open", ownerId: ctx.user.id, isFrozen: input.severity === "critical" }); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "incident.create", resourceType: "incident", resourceId: id }); return { id } as const; }),
    updateSupportTicket: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "assigned", "waiting", "escalated", "resolved"]).optional(), priority: z.enum(["normal", "high", "urgent"]).optional(), assignedTo: z.number().int().positive().nullable().optional(), slaDueAt: z.coerce.date().optional(), escalationReason: z.string().max(200).optional() })).mutation(async ({ input, ctx }) => { const { id, ...changes } = input; await updateSupportTicket(id, changes); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "support_ticket.update", resourceType: "support_ticket", resourceId: id }); return { success: true } as const; }),
    updateIncident: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "contained", "resolved", "postmortem"]).optional(), severity: z.enum(["low", "medium", "high", "critical"]).optional(), ownerId: z.number().int().positive().nullable().optional(), isFrozen: z.boolean().optional(), evidenceReference: z.string().max(1000).optional(), escalationReason: z.string().max(200).optional() })).mutation(async ({ input, ctx }) => { const { id, ...changes } = input; await updateIncidentRecord(id, changes); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "incident.update", resourceType: "incident", resourceId: id, metadata: JSON.stringify(changes) }); return { success: true } as const; }),
    preserveIncidentEvidence: adminProcedure.input(z.object({ id: z.number().int().positive(), evidenceReference: z.string().min(3).max(1000) })).mutation(async ({ input, ctx }) => { await updateIncidentRecord(input.id, { evidenceReference: input.evidenceReference }); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "incident.evidence_preserved", resourceType: "incident", resourceId: input.id }); return { success: true } as const; }),
    escalateIncident: adminProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().min(3).max(200) })).mutation(async ({ input, ctx }) => { await updateIncidentRecord(input.id, { status: "contained", escalationReason: input.reason, isFrozen: true }); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "incident.escalate", resourceType: "incident", resourceId: input.id, metadata: JSON.stringify({ reason: input.reason }) }); return { success: true } as const; }),
    subscriptionPlans: adminProcedure.query(() => listSubscriptionPlans()),
    updateSubscriptionPlan: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).max(80).optional(), description: z.string().max(500).optional(), isActive: z.boolean().optional(), confirmation: z.literal("CONFIRM") })).mutation(async ({ input, ctx }) => { const { id, confirmation, ...changes } = input; void confirmation; await updateSubscriptionPlan(id, changes, ctx.user.id); return { success: true } as const; }),
    subscriptionEntitlementPreview: adminProcedure.input(z.object({ userId: z.number().int().positive(), planCode: z.enum(["free", "basic", "advanced"]), endsAt: z.coerce.date().optional() })).query(({ input }) => getSubscriptionEntitlementPreview(input.userId, input.planCode, input.endsAt)),
    changeUserSubscription: adminProcedure.input(z.object({ userId: z.number().int().positive(), planCode: z.string().min(2).max(40), status: z.enum(["active", "expired", "cancelled"]), endsAt: z.coerce.date().optional(), changeReason: z.string().min(3).max(500), confirmation: z.literal("CONFIRM") })).mutation(({ input, ctx }) => changeUserSubscription({ ...input, changedBy: ctx.user.id })),
    profileFieldPolicies: adminProcedure.query(() => listProfileFieldPolicies()),
    updateProfileFieldPolicy: adminProcedure.input(z.object({ id: z.number().int().positive(), freeAccess: z.boolean().optional(), basicAccess: z.boolean().optional(), advancedAccess: z.boolean().optional(), requiresOwnerConsent: z.boolean().optional(), isSensitive: z.boolean().optional() })).mutation(async ({ input, ctx }) => { const { id, ...changes } = input; await updateProfileFieldPolicy(id, changes, ctx.user.id); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "profile_policy.update", resourceType: "profile_field_policy", resourceId: id }); return { success: true } as const; }),
    profileProjection: protectedProcedure
      .input(z.object({
        profile: z.record(z.string(), z.unknown()),
        ownerConsent: z.record(z.string(), z.boolean().optional()),
        ownerPrivacy: z.record(z.string(), z.boolean().optional()),
        verificationState: z.enum(["unverified", "pending", "verified", "expired"]).optional(),
        relationshipState: z.enum(["none", "requested", "matched", "blocked"]).optional(),
      }))
      .query(async ({ input, ctx }) => { const subscription = await getEffectiveSubscription(ctx.user.id); const plan = resolveEffectivePlan(subscription); return { plan, fields: projectProfile(input.profile, await listProfileFieldPolicies(), { ...input, plan }) }; }),
  }),
});

export type AppRouter = typeof appRouter;
