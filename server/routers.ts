import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { evaluateSafetyRules, findBlockedDomains, highestSafetyAction } from "./safetyEngine";
import { projectProfile, resolveEffectivePlan } from "./entitlements";
import { canExecuteApprovedAction } from "./approvalPolicy";
import { getCommunityPermissions } from "./communityPolicy";
import { normalizeAdminDomain, validateCommunityEligibility } from "./adminValidation";
import {
  createAuditLog,
  createCommunity,
  assignCommunityModerator,
  createBlockedDomain,
  updateBlockedDomain,
  createReviewCase,
  createSafetyRule,
  createSafetyRuleVersion,
  updateSafetyRule,
  getEffectiveSubscription,
  getOperationsCounts,
  joinCommunity,
  leaveCommunity,
  listCommunities,
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
  recordHumanReview,
  rollbackSafetyRule,
  setCommunityStatus,
  updateCommunity,
  removeCommunityModerator,
  setSafetyRuleStatus,
  updateProfileFieldPolicy,
} from "./db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access is required" });
  }
  return next();
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
  operations: router({
    accessCheck: adminProcedure.query(() => ({ allowed: true as const })),
    auditLogs: adminProcedure.query(() => listAuditLogs()),
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
        return { allowed: matches.length === 0 && blockedUrls.length === 0, action: highestSafetyAction(matches)?.action ?? (blockedUrls.length ? "block" : "allow"), matches, blockedUrls };
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
    createHumanReviewCase: protectedProcedure
      .input(z.object({ caseType: z.enum(["moderation", "verification", "support", "incident", "agent_review"]), severity: z.enum(["low", "medium", "high", "critical"]), summary: z.string().min(1).max(2000), subjectType: z.string().max(40).optional(), subjectId: z.number().int().positive().optional(), source: z.string().max(40).default("agent") }))
      .mutation(async ({ input, ctx }) => ({ caseId: await createReviewCase({ ...input, assignedTo: null }) })),
    completeHumanReview: adminProcedure
      .input(z.object({ caseId: z.number().int().positive(), decision: z.string().min(1).max(60), reasonCode: z.string().min(1).max(80), notes: z.string().max(4000).optional() }))
      .mutation(async ({ input, ctx }) => { await recordHumanReview({ ...input, reviewerId: ctx.user.id }); await createAuditLog({ actorType: "admin", actorId: ctx.user.id, action: "human_review.complete", resourceType: "review_case", resourceId: input.caseId, metadata: JSON.stringify({ decision: input.decision, reasonCode: input.reasonCode }) }); return { success: true } as const; }),
    reviewCases: adminProcedure.query(() => listReviewCases()),
    moderationQueue: adminProcedure.query(() => listReviewCasesByType("moderation")),
    verificationQueue: adminProcedure.query(() => listReviewCasesByType("verification")),
    supportQueue: adminProcedure.query(() => listReviewCasesByType("support")),
    incidentQueue: adminProcedure.query(() => listReviewCasesByType("incident")),
    agentReviewQueue: adminProcedure.query(() => listReviewCasesByType("agent_review")),
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
