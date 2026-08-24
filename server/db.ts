import { TRPCError } from "@trpc/server";
import { drizzle } from "drizzle-orm/mysql2";
import { and, desc, eq, or, sql } from "drizzle-orm";
import {
  agentDecisions,
  auditLogs,
  blockedDomains,
  communities,
  communityMemberships,
  communityModerators,
  humanReviews,
  profileFieldPolicies,
  planEntitlements,
  mediaAssets,
  posts,
  comments,
  profiles,
  reviewCases,
  reviewCaseEvidence,
  supportTickets,
  incidentRecords,
  telegramUpdateReceipts,
  safetyRuleVersions,
  safetyRules,
  subscriptionPlans,
  userSubscriptions,
  userInterests,
  userBlocks,
  matches,
  userReports,
  profilePhotos,
  conversations,
  messages,
  verificationSubmissions,
  verificationReviewDetails,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { canJoinCommunity, getCommunityPermissions, parseCommunityEligibility } from "./communityPolicy";

let _db: ReturnType<typeof drizzle> | null = null;

function assertMutationChanged(result: unknown, resource: string) {
  const affectedRows = Number((result as [{ affectedRows?: number }])?.[0]?.affectedRows ?? 0);
  if (affectedRows < 1) throw new TRPCError({ code: "NOT_FOUND", message: `${resource} was not found or did not change` });
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getOperationsCounts() {
  const db = await getDb();
  if (!db) return { openCases: 0, activeRules: 0, activeCommunities: 0, comingSoonCommunities: 0 };
  const [cases, rules, activeCommunities, comingSoonCommunities] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(reviewCases).where(sql`${reviewCases.status} <> 'resolved'`),
    db.select({ count: sql<number>`count(*)` }).from(safetyRules).where(eq(safetyRules.isActive, true)),
    db.select({ count: sql<number>`count(*)` }).from(communities).where(eq(communities.status, "active")),
    db.select({ count: sql<number>`count(*)` }).from(communities).where(eq(communities.status, "coming_soon")),
  ]);
  return {
    openCases: Number(cases[0]?.count ?? 0),
    activeRules: Number(rules[0]?.count ?? 0),
    activeCommunities: Number(activeCommunities[0]?.count ?? 0),
    comingSoonCommunities: Number(comingSoonCommunities[0]?.count ?? 0),
  };
}

export async function listSafetyRules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(safetyRules).orderBy(desc(safetyRules.updatedAt));
}

export async function createSafetyRule(input: typeof safetyRules.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(safetyRules).values(input);
  return Number(result[0].insertId);
}

export async function updateSafetyRule(id: number, input: Partial<Pick<typeof safetyRules.$inferInsert, "name" | "pattern" | "scope" | "language" | "severity" | "action">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(safetyRules).set(input).where(eq(safetyRules.id, id));
  assertMutationChanged(result, "Safety rule");
}

export async function setSafetyRuleStatus(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(safetyRules).set({ isActive }).where(eq(safetyRules.id, id));
  assertMutationChanged(result, "Safety rule status");
}

export async function createSafetyRuleVersion(input: typeof safetyRuleVersions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(safetyRuleVersions).values(input);
  const result = await db.update(safetyRules).set({ pattern: input.pattern, action: input.action as typeof safetyRules.$inferSelect.action, version: input.version }).where(eq(safetyRules.id, input.ruleId));
  assertMutationChanged(result, "Safety rule version target");
}

export async function rollbackSafetyRule(ruleId: number, version: number, actorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const previous = await db.select().from(safetyRuleVersions).where(eq(safetyRuleVersions.ruleId, ruleId)).orderBy(desc(safetyRuleVersions.version));
  const target = previous.find(item => item.version === version);
  if (!target) throw new Error("Rule version not found");
  const result = await db.update(safetyRules).set({ pattern: target.pattern, action: target.action as typeof safetyRules.$inferSelect.action, version: target.version }).where(eq(safetyRules.id, ruleId));
  assertMutationChanged(result, "Safety rule rollback target");
  await db.insert(auditLogs).values({ actorType: "admin", actorId, action: "safety_rule.rollback", resourceType: "safety_rule", resourceId: ruleId, metadata: JSON.stringify({ version }) });
}

export async function createBlockedDomain(input: typeof blockedDomains.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(blockedDomains).values(input);
  return Number(result[0].insertId);
}

export async function setBlockedDomainStatus(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(blockedDomains).set({ isActive }).where(eq(blockedDomains.id, id));
  assertMutationChanged(result, "Blocked domain status");
}

export async function listBlockedDomains() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blockedDomains).orderBy(desc(blockedDomains.updatedAt));
}

export async function createAuditLog(input: typeof auditLogs.$inferInsert) {

  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(input);
}

export async function listCommunities() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(communities).orderBy(desc(communities.updatedAt));
}

export async function createCommunity(input: typeof communities.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(communities).values(input);
  return Number(result[0].insertId);
}

export async function updateCommunity(id: number, input: Partial<Pick<typeof communities.$inferInsert, "name" | "description" | "eligibility" | "categoryType">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(communities).set(input).where(eq(communities.id, id));
  assertMutationChanged(result, "Community");
}

export async function setCommunityStatus(id: number, status: "coming_soon" | "active" | "archived") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const target = await db.select().from(communities).where(eq(communities.id, id)).limit(1);
  if (status === "active" && target[0]?.categoryType === "country") {
    const religionCommunities = await db.select({ count: sql<number>`count(*)` }).from(communities).where(eq(communities.categoryType, "religion"));
    if (Number(religionCommunities[0]?.count ?? 0) === 0) throw new Error("Religion communities must be configured before country rollout");
  }
  const result = await db.update(communities).set({ status }).where(eq(communities.id, id));
  assertMutationChanged(result, "Community status");
}

export async function joinCommunity(communityId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const community = await db.select().from(communities).where(eq(communities.id, communityId)).limit(1);
  if (community[0]?.status !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "Only active communities can be joined" });
  const profile = await getUserProfile(userId);
  if (!canJoinCommunity(parseCommunityEligibility(community[0].eligibility), profile)) throw new TRPCError({ code: "FORBIDDEN", message: "This community has eligibility requirements your profile does not meet" });
  const existing = await db.select().from(communityMemberships).where(sql`${communityMemberships.communityId} = ${communityId} AND ${communityMemberships.userId} = ${userId}`).limit(1);
  if (existing[0]?.status === "active") return existing[0].id;
  if (existing[0]?.status === "restricted") throw new Error("This membership is restricted");
  if (existing[0]) {
    const result = await db.update(communityMemberships).set({ status: "active", joinedAt: new Date(), leftAt: null }).where(eq(communityMemberships.id, existing[0].id));
    assertMutationChanged(result, "Community membership");
    return existing[0].id;
  }
  const result = await db.insert(communityMemberships).values({ communityId, userId, status: "active" });
  return Number(result[0].insertId);
}

export async function canUserJoinCommunity(communityId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  const community = await db.select().from(communities).where(eq(communities.id, communityId)).limit(1);
  if (community[0]?.status !== "active") return false;
  return canJoinCommunity(parseCommunityEligibility(community[0].eligibility), await getUserProfile(userId));
}

export async function leaveCommunity(communityId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(communityMemberships).set({ status: "left", leftAt: new Date() }).where(sql`${communityMemberships.communityId} = ${communityId} AND ${communityMemberships.userId} = ${userId} AND ${communityMemberships.status} = 'active'`);
  assertMutationChanged(result, "Community membership");
}

export async function listUserMemberships(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(communityMemberships).where(eq(communityMemberships.userId, userId));
}

export async function assignCommunityModerator(communityId: number, userId: number, assignedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(communityModerators).where(sql`${communityModerators.communityId} = ${communityId} AND ${communityModerators.userId} = ${userId}`).limit(1);
  if (existing[0]) {
    const result = await db.update(communityModerators).set({ isActive: true, assignedBy }).where(eq(communityModerators.id, existing[0].id));
    assertMutationChanged(result, "Community moderator");
    return existing[0].id;
  }
  const result = await db.insert(communityModerators).values({ communityId, userId, assignedBy, isActive: true });
  return Number(result[0].insertId);
}

export async function listCommunityMembers(communityId: number) {
  const db = await getDb();
  if (!db) return [];
  const community = await db.select({ status: communities.status }).from(communities).where(eq(communities.id, communityId)).limit(1);
  if (community[0]?.status !== "active") throw new Error("Member lists are unavailable until a community is active");
  return db.select({ id: communityMemberships.id, userId: communityMemberships.userId, joinedAt: communityMemberships.joinedAt }).from(communityMemberships).where(sql`${communityMemberships.communityId} = ${communityId} AND ${communityMemberships.status} = 'active'`);
}

export async function listCommunityModerators(communityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(communityModerators).where(sql`${communityModerators.communityId} = ${communityId} AND ${communityModerators.isActive} = true`);
}

export async function removeCommunityModerator(id: number, assignedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(communityModerators).set({ isActive: false, assignedBy }).where(eq(communityModerators.id, id));
  assertMutationChanged(result, "Community moderator");
}

export async function listReviewCases() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviewCases).orderBy(desc(reviewCases.createdAt)).limit(50);
}

export async function listReviewCasesByType(caseType: "moderation" | "verification" | "support" | "incident" | "agent_review") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviewCases).where(eq(reviewCases.caseType, caseType)).orderBy(desc(reviewCases.createdAt)).limit(50);
}

export async function createReviewCase(input: typeof reviewCases.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(reviewCases).values(input);
  return Number(result[0].insertId);
}

export async function listReviewCaseEvidence(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviewCaseEvidence).where(eq(reviewCaseEvidence.caseId, caseId));
}

export async function addReviewCaseEvidence(input: typeof reviewCaseEvidence.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(reviewCaseEvidence).values(input);
  return Number(result[0].insertId);
}

export async function getVerificationDetail(caseId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(verificationReviewDetails).where(eq(verificationReviewDetails.caseId, caseId)).limit(1);
  return rows[0];
}

export async function upsertVerificationDetail(input: typeof verificationReviewDetails.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(verificationReviewDetails).where(eq(verificationReviewDetails.caseId, input.caseId)).limit(1);
  if (existing[0]) {
    const result = await db.update(verificationReviewDetails).set({ resubmissionReason: input.resubmissionReason, fallbackProvider: input.fallbackProvider, fallbackOutcome: input.fallbackOutcome, appealNotes: input.appealNotes }).where(eq(verificationReviewDetails.id, existing[0].id));
    assertMutationChanged(result, "Verification detail");
    return existing[0].id;
  }
  const result = await db.insert(verificationReviewDetails).values(input);
  return Number(result[0].insertId);
}

export async function updateReviewCase(id: number, input: Partial<Pick<typeof reviewCases.$inferInsert, "status" | "assignedTo" | "severity" | "summary">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(reviewCases).set(input).where(eq(reviewCases.id, id));
  assertMutationChanged(result, "Review case");
}

export async function recordHumanReview(input: typeof humanReviews.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const target = await tx.select({ id: reviewCases.id }).from(reviewCases).where(eq(reviewCases.id, input.caseId)).limit(1);
    if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Human-review case was not found" });
    await tx.insert(humanReviews).values(input);
    const result = await tx.update(reviewCases).set({ status: "resolved", assignedTo: input.reviewerId ?? null }).where(eq(reviewCases.id, input.caseId));
    assertMutationChanged(result, "Human-review case");
  });
}

export async function createSupportTicket(input: typeof supportTickets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(supportTickets).values(input);
  return Number(result[0].insertId);
}

export async function createIncidentRecord(input: typeof incidentRecords.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(incidentRecords).values(input);
  return Number(result[0].insertId);
}

export async function claimTelegramUpdate(input: typeof telegramUpdateReceipts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  try {
    await db.insert(telegramUpdateReceipts).values(input);
    return true;
  } catch (error) {
    if (String(error).toLowerCase().includes("duplicate") || String(error).toLowerCase().includes("unique")) return false;
    throw error;
  }
}

export async function createAgentDecision(input: typeof agentDecisions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(agentDecisions).values(input);
  return Number(result[0].insertId);
}

export async function listSupportTickets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt)).limit(50);
}

export async function listIncidentRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incidentRecords).orderBy(desc(incidentRecords.updatedAt)).limit(50);
}

export async function updateSupportTicket(id: number, input: Partial<Pick<typeof supportTickets.$inferInsert, "status" | "priority" | "assignedTo" | "slaDueAt" | "escalationReason">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(supportTickets).set(input).where(eq(supportTickets.id, id));
  assertMutationChanged(result, "Support ticket");
}

export async function updateIncidentRecord(id: number, input: Partial<Pick<typeof incidentRecords.$inferInsert, "status" | "ownerId" | "severity" | "isFrozen" | "evidenceReference" | "escalationReason">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(incidentRecords).set(input).where(eq(incidentRecords.id, id));
  assertMutationChanged(result, "Incident record");
}

export async function getEffectiveSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select({ planCode: subscriptionPlans.code, status: userSubscriptions.status, endsAt: userSubscriptions.endsAt }).from(userSubscriptions).innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id)).where(sql`${userSubscriptions.userId} = ${userId} AND ${userSubscriptions.status} = 'active'`).orderBy(desc(userSubscriptions.createdAt)).limit(1);
  const current = rows[0];
  if (!current || (current.endsAt && current.endsAt.getTime() <= Date.now())) return undefined;
  return { planCode: current.planCode as "free" | "basic" | "advanced", status: current.status, endsAt: current.endsAt };
}

export async function changeUserSubscription(input: { userId: number; planCode: string; status: "active" | "expired" | "cancelled"; changedBy: number; endsAt?: Date; changeReason: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const plan = await tx.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, input.planCode)).limit(1);
    if (!plan[0] || !plan[0].isActive) throw new Error("Subscription plan is not available");
    await tx.update(userSubscriptions).set({ status: "expired", activeKey: null, updatedAt: new Date(), changeReason: input.changeReason }).where(sql`${userSubscriptions.userId} = ${input.userId} AND ${userSubscriptions.status} = 'active'`);
    const result = await tx.insert(userSubscriptions).values({ userId: input.userId, planId: plan[0].id, status: input.status, activeKey: input.status === "active" ? `user:${input.userId}` : null, changedBy: input.changedBy, endsAt: input.endsAt, changeReason: input.changeReason });
    const subscriptionId = Number(result[0].insertId);
    await tx.insert(auditLogs).values({ actorType: "admin", actorId: input.changedBy, action: "subscription.change", resourceType: "user_subscription", resourceId: subscriptionId, metadata: JSON.stringify({ userId: input.userId, planCode: input.planCode, status: input.status, reason: input.changeReason }) });
    return subscriptionId;
  });
}

export async function listSubscriptionPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).orderBy(subscriptionPlans.id);
}

export async function listAuditLogs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(50);
}

export async function updateProfileFieldPolicy(id: number, input: Partial<Pick<typeof profileFieldPolicies.$inferInsert, "freeAccess" | "basicAccess" | "advancedAccess" | "requiresOwnerConsent" | "isSensitive">>, updatedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(profileFieldPolicies).set({ ...input, updatedBy }).where(eq(profileFieldPolicies.id, id));
  assertMutationChanged(result, "Profile field policy");
}

export async function listProfileFieldPolicies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profileFieldPolicies).orderBy(profileFieldPolicies.fieldKey);
}

export async function getCommunityModeratorPreview(communityId: number, userId: number) {
  const community = (await listCommunities()).find(item => item.id === communityId);
  const moderators = await listCommunityModerators(communityId);
  const currentlyAssigned = moderators.some(item => item.userId === userId);
  const status = community?.status;
  return {
    communityId,
    communityName: community?.name ?? null,
    status: status ?? null,
    currentlyAssigned,
    before: getCommunityPermissions(status, currentlyAssigned),
    afterAssignment: getCommunityPermissions(status, true),
    assignedModeratorIds: moderators.map(item => item.userId),
  };
}

export async function getSubscriptionEntitlementPreview(userId: number, requestedPlanCode: "free" | "basic" | "advanced", requestedEndsAt?: Date) {
  const current = await getEffectiveSubscription(userId);
  const isExpired = Boolean(requestedEndsAt && requestedEndsAt.getTime() <= Date.now());
  const effectivePlan = isExpired ? "free" : requestedPlanCode;
  const policies = await listProfileFieldPolicies();
  const allowedFields = policies.filter(policy => effectivePlan === "free" ? policy.freeAccess : effectivePlan === "basic" ? policy.basicAccess : policy.advancedAccess).map(policy => policy.fieldKey);
  return {
    userId,
    requestedPlan: requestedPlanCode,
    effectivePlan,
    requestedEndsAt: requestedEndsAt ?? null,
    currentPlan: current?.planCode ?? "free",
    currentEndsAt: current?.endsAt ?? null,
    isExpired,
    fallbackApplied: isExpired,
    allowedFields,
    allowedFieldCount: allowedFields.length,
  } as const;
}

export async function updateBlockedDomain(id: number, input: { severity?: "low" | "medium" | "high" | "critical"; reason?: string }, updatedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(blockedDomains).set({ ...input, updatedAt: new Date() }).where(eq(blockedDomains.id, id));
  assertMutationChanged(result, "Blocked domain");
  await createAuditLog({ actorType: "admin", actorId: updatedBy, action: "blocked_domain.update", resourceType: "blocked_domain", resourceId: id, metadata: JSON.stringify(input) });
}

export async function updateSubscriptionPlan(id: number, input: { name?: string; description?: string; isActive?: boolean }, updatedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(subscriptionPlans).set({ ...input, updatedAt: new Date() }).where(eq(subscriptionPlans.id, id));
  assertMutationChanged(result, "Subscription plan");
  await createAuditLog({ actorType: "admin", actorId: updatedBy, action: "subscription_plan.update", resourceType: "subscription_plan", resourceId: id, metadata: JSON.stringify(input) });
}


const CORE_POLICY_DEFAULTS = {
  plans: [
    { code: "free", name: "Free", description: "Core access with safety and privacy protections." },
    { code: "basic", name: "Basic Paid", description: "Expanded discovery access without bypassing privacy or consent." },
    { code: "advanced", name: "Advanced Paid", description: "Highest plan access subject to consent, verification and safety policy." },
  ] as const,
  profileFields: [
    { fieldKey: "displayName", freeAccess: true, basicAccess: true, advancedAccess: true, requiresOwnerConsent: false, isSensitive: false },
    { fieldKey: "ageRange", freeAccess: true, basicAccess: true, advancedAccess: true, requiresOwnerConsent: false, isSensitive: false },
    { fieldKey: "mainPhoto", freeAccess: true, basicAccess: true, advancedAccess: true, requiresOwnerConsent: false, isSensitive: false },
    { fieldKey: "introduction", freeAccess: true, basicAccess: true, advancedAccess: true, requiresOwnerConsent: false, isSensitive: false },
    { fieldKey: "languages", freeAccess: true, basicAccess: true, advancedAccess: true, requiresOwnerConsent: false, isSensitive: false },
    { fieldKey: "approximateLocation", freeAccess: true, basicAccess: true, advancedAccess: true, requiresOwnerConsent: false, isSensitive: false },
    { fieldKey: "profession", freeAccess: false, basicAccess: true, advancedAccess: true, requiresOwnerConsent: true, isSensitive: false },
    { fieldKey: "education", freeAccess: false, basicAccess: true, advancedAccess: true, requiresOwnerConsent: true, isSensitive: false },
    { fieldKey: "marriageExpectations", freeAccess: false, basicAccess: true, advancedAccess: true, requiresOwnerConsent: true, isSensitive: false },
    { fieldKey: "compatibilityPrompts", freeAccess: false, basicAccess: true, advancedAccess: true, requiresOwnerConsent: true, isSensitive: false },
    { fieldKey: "privatePhoto", freeAccess: false, basicAccess: false, advancedAccess: true, requiresOwnerConsent: true, isSensitive: true },
    { fieldKey: "phone", freeAccess: false, basicAccess: false, advancedAccess: false, requiresOwnerConsent: true, isSensitive: true },
    { fieldKey: "email", freeAccess: false, basicAccess: false, advancedAccess: false, requiresOwnerConsent: true, isSensitive: true },
    { fieldKey: "exactLocation", freeAccess: false, basicAccess: false, advancedAccess: false, requiresOwnerConsent: true, isSensitive: true },
    { fieldKey: "communityHiddenIdentity", freeAccess: true, basicAccess: true, advancedAccess: true, requiresOwnerConsent: false, isSensitive: false },
  ] as const,
  safetyRules: [
    { name: "International phone number", ruleType: "phone_number", pattern: "\\+?[0-9]{7,15}", scope: "posts,comments,messages,profiles", language: "all", severity: "high", action: "block", version: 1 },
    { name: "Contact handle", ruleType: "personal_data", pattern: "(?:whatsapp|telegram|snapchat|instagram)\\s*[:@]", scope: "posts,comments,messages,profiles", language: "all", severity: "high", action: "block", version: 1 },
    { name: "External URL", ruleType: "link_domain", pattern: "https?:\\/\\/|www\\.", scope: "posts,comments,messages,profiles", language: "all", severity: "medium", action: "block", version: 1 },
  ] as const,
} as const;

export async function ensureCorePolicyDefaults() {
  const db = await getDb();
  if (!db) return { seeded: false, reason: "database_unavailable" as const };

  let seeded = 0;
  const existingPlans = await db.select().from(subscriptionPlans);
  for (const plan of CORE_POLICY_DEFAULTS.plans) {
    if (!existingPlans.some(item => item.code === plan.code)) {
      await db.insert(subscriptionPlans).values(plan);
      seeded += 1;
    }
  }

  const refreshedPlans = await db.select().from(subscriptionPlans);
  for (const field of CORE_POLICY_DEFAULTS.profileFields) {
    const existing = await db.select().from(profileFieldPolicies).where(eq(profileFieldPolicies.fieldKey, field.fieldKey)).limit(1);
    if (!existing.length) {
      await db.insert(profileFieldPolicies).values(field);
      seeded += 1;
    }
  }

  const refreshedPlansByCode = new Map(refreshedPlans.map(plan => [plan.code, plan.id]));
  const existingEntitlements = await db.select().from(planEntitlements);
  for (const planCode of ["free", "basic", "advanced"] as const) {
    const planId = refreshedPlansByCode.get(planCode);
    if (!planId) continue;
    const existingKeys = new Set(existingEntitlements.filter(item => item.planId === planId).map(item => item.key));
    const defaults = planCode === "free" ? ["profile_projection", "community_read"] : planCode === "basic" ? ["profile_projection", "community_read", "discovery_extended"] : ["profile_projection", "community_read", "discovery_extended", "private_photo_request"];
    for (const key of defaults) {
      if (!existingKeys.has(key)) {
        await db.insert(planEntitlements).values({ planId, key, value: "enabled" });
        seeded += 1;
      }
    }
  }

  const existingRules = await db.select().from(safetyRules);
  for (const rule of CORE_POLICY_DEFAULTS.safetyRules) {
    const existing = existingRules.find(item => item.name === rule.name);
    let ruleId = existing?.id;
    if (!existing) {
      const result = await db.insert(safetyRules).values({ ...rule, isActive: true, createdBy: null });
      ruleId = Number(result[0].insertId);
      seeded += 1;
    }
    if (ruleId) {
      const versions = await db.select().from(safetyRuleVersions).where(eq(safetyRuleVersions.ruleId, ruleId)).limit(1);
      if (!versions.length) {
        await db.insert(safetyRuleVersions).values({ ruleId, version: rule.version, pattern: rule.pattern, action: rule.action, changedBy: null, changeReason: "Baseline policy bootstrap" });
        seeded += 1;
      }
    }
  }
  return { seeded, reason: "ok" as const };
}

export async function getCorePolicyReadiness() {
  const db = await getDb();
  const emptyChecks = { database: false, plans: false, profilePolicies: false, entitlements: false, activeSafetyRules: false, safetyRuleVersions: false };
  if (!db) return { ready: false, checks: emptyChecks } as const;
  const [plans, policies, entitlements, activeRules, ruleVersions] = await Promise.all([
    db.select().from(subscriptionPlans),
    db.select().from(profileFieldPolicies),
    db.select().from(planEntitlements),
    db.select().from(safetyRules).where(eq(safetyRules.isActive, true)),
    db.select().from(safetyRuleVersions),
  ]);
  const requiredPlanCodes = ["free", "basic", "advanced"] as const;
  const requiredEntitlements = {
    free: ["profile_projection", "community_read"],
    basic: ["profile_projection", "community_read", "discovery_extended"],
    advanced: ["profile_projection", "community_read", "discovery_extended", "private_photo_request"],
  } as const;
  const planIds = new Map(plans.map(plan => [plan.code, plan.id]));
  const entitlementsReady = requiredPlanCodes.every(code => {
    const planId = planIds.get(code);
    return Boolean(planId) && requiredEntitlements[code].every(key => entitlements.some(item => item.planId === planId && item.key === key));
  });
  const baselineRuleNames = CORE_POLICY_DEFAULTS.safetyRules.map(rule => rule.name);
  const activeBaselineRules = baselineRuleNames.every(name => activeRules.some(rule => rule.name === name));
  const versionedBaselineRules = activeRules.filter(rule => baselineRuleNames.includes(rule.name as (typeof baselineRuleNames)[number])).every(rule => ruleVersions.some(version => version.ruleId === rule.id && version.version >= 1));
  const checks = {
    database: true,
    plans: requiredPlanCodes.every(code => plans.some(plan => plan.code === code && plan.isActive)),
    profilePolicies: CORE_POLICY_DEFAULTS.profileFields.every(field => policies.some(policy => policy.fieldKey === field.fieldKey)),
    entitlements: entitlementsReady,
    activeSafetyRules: activeBaselineRules,
    safetyRuleVersions: versionedBaselineRules,
  };
  return { ready: Object.values(checks).every(Boolean), checks } as const;
}


export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return rows[0];
}

export async function upsertUserProfile(userId: number, input: Partial<typeof profiles.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (existing[0]) {
    const result = await db.update(profiles).set(input).where(eq(profiles.id, existing[0].id));
    assertMutationChanged(result, "Profile");
    return existing[0].id;
  }
  const result = await db.insert(profiles).values({ userId, ...input });
  return Number(result[0].insertId);
}


export async function getActiveMediaAssetByKey(storageKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(mediaAssets).where(sql`${mediaAssets.storageKey} = ${storageKey} AND ${mediaAssets.status} = 'active'`).limit(1);
  return rows[0];
}


export async function createMediaAsset(input: typeof mediaAssets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(mediaAssets).values(input);
  return Number(result[0].insertId);
}


export async function createPost(input: typeof posts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(posts).values(input);
  return Number(result[0].insertId);
}

export async function listCommunityPosts(communityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).where(sql`${posts.communityId} = ${communityId} AND ${posts.status} = 'published'`).orderBy(desc(posts.createdAt)).limit(50);
}

export async function getPost(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return rows[0];
}

export async function createComment(input: typeof comments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const post = await getPost(input.postId);
  if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
  if (post.status !== "published") throw new TRPCError({ code: "FORBIDDEN", message: "Comments are unavailable on this post" });
  const result = await db.insert(comments).values(input);
  return Number(result[0].insertId);
}

export async function listPostComments(postId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(comments).where(sql`${comments.postId} = ${postId} AND ${comments.status} = 'published'`).orderBy(comments.createdAt).limit(100);
}


export async function isActiveCommunityMember(communityId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: communityMemberships.id }).from(communityMemberships).where(sql`${communityMemberships.communityId} = ${communityId} AND ${communityMemberships.userId} = ${userId} AND ${communityMemberships.status} = 'active'`).limit(1);
  return Boolean(rows[0]);
}

export async function listUserInterests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userInterests).where(eq(userInterests.userId, userId)).orderBy(userInterests.createdAt);
}

export async function replaceUserInterests(userId: number, interestKeys: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const normalized = Array.from(new Set(interestKeys.map(value => value.trim().toLowerCase()).filter(Boolean)));
  return db.transaction(async tx => {
    await tx.delete(userInterests).where(eq(userInterests.userId, userId));
    if (normalized.length > 0) await tx.insert(userInterests).values(normalized.map(interestKey => ({ userId, interestKey })));
    return normalized;
  });
}

export async function listDiscoverableProfiles(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profiles).where(sql`${profiles.profileStatus} = 'active' AND ${profiles.userId} <> ${userId} AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE b.status = 'active' AND ((b.blockerUserId = ${userId} AND b.blockedUserId = ${profiles.userId}) OR (b.blockerUserId = ${profiles.userId} AND b.blockedUserId = ${userId})))`).orderBy(desc(profiles.updatedAt)).limit(limit);
}

export async function upsertMatchRequest(userId: number, otherUserId: number) {
  if (userId === otherUserId) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot match with yourself" });
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const userAId = Math.min(userId, otherUserId);
  const userBId = Math.max(userId, otherUserId);
  return db.transaction(async tx => {
    const targetProfile = await tx.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.userId, otherUserId), eq(profiles.profileStatus, "active"))).limit(1);
    if (!targetProfile[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Active profile was not found" });
    const blocked = await tx.select({ id: userBlocks.id }).from(userBlocks).where(sql`${userBlocks.status} = 'active' AND (( ${userBlocks.blockerUserId} = ${userId} AND ${userBlocks.blockedUserId} = ${otherUserId}) OR (${userBlocks.blockerUserId} = ${otherUserId} AND ${userBlocks.blockedUserId} = ${userId}))`).limit(1);
    if (blocked[0]) throw new TRPCError({ code: "FORBIDDEN", message: "This profile is unavailable" });
    const existing = await tx.select({ id: matches.id }).from(matches).where(and(eq(matches.userAId, userAId), eq(matches.userBId, userBId))).limit(1);
    if (existing[0]) {
      await tx.update(matches).set({ status: "requested" }).where(eq(matches.id, existing[0].id));
      return existing[0].id;
    }
    const result = await tx.insert(matches).values({ userAId, userBId, requestedBy: userId, status: "requested" });
    return Number(result[0].insertId);
  });
}

export async function listUserMatches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matches).where(or(eq(matches.userAId, userId), eq(matches.userBId, userId))).orderBy(desc(matches.updatedAt)).limit(100);
}

export async function getRelationshipState(viewerUserId: number, subjectUserId: number) {
  if (viewerUserId === subjectUserId) return "none" as const;
  const db = await getDb();
  if (!db) return "none" as const;
  const blocked = await db.select({ id: userBlocks.id }).from(userBlocks).where(sql`${userBlocks.status} = 'active' AND (( ${userBlocks.blockerUserId} = ${viewerUserId} AND ${userBlocks.blockedUserId} = ${subjectUserId}) OR (${userBlocks.blockerUserId} = ${subjectUserId} AND ${userBlocks.blockedUserId} = ${viewerUserId}))`).limit(1);
  if (blocked[0]) return "blocked" as const;
  const userAId = Math.min(viewerUserId, subjectUserId);
  const userBId = Math.max(viewerUserId, subjectUserId);
  const rows = await db.select({ status: matches.status }).from(matches).where(and(eq(matches.userAId, userAId), eq(matches.userBId, userBId))).limit(1);
  if (rows[0]?.status === "accepted") return "matched" as const;
  if (rows[0]?.status === "requested") return "requested" as const;
  return "none" as const;
}

export async function transitionMatch(userId: number, matchId: number, action: "accept" | "reject") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(matches).where(and(eq(matches.id, matchId), or(eq(matches.userAId, userId), eq(matches.userBId, userId)))).limit(1);
  const match = rows[0];
  if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "Match was not found" });
  if (match.status !== "requested") throw new TRPCError({ code: "CONFLICT", message: "This match is no longer awaiting a response" });
  if (action === "accept" && match.requestedBy === userId) throw new TRPCError({ code: "FORBIDDEN", message: "The requester cannot accept their own request" });
  const result = await db.update(matches).set({ status: action === "accept" ? "accepted" : "rejected" }).where(eq(matches.id, matchId));
  assertMutationChanged(result, "Match");
  return action === "accept" ? "accepted" as const : "rejected" as const;
}

export async function linkProfilePhoto(userId: number, mediaAssetId: number, sortOrder: number, isPrimary: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const profile = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Create a profile before adding photos" });
    const media = await tx.select({ id: mediaAssets.id }).from(mediaAssets).where(and(eq(mediaAssets.id, mediaAssetId), eq(mediaAssets.ownerUserId, userId), eq(mediaAssets.purpose, "profile_photo"), eq(mediaAssets.status, "active"))).limit(1);
    if (!media[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Photo asset is not owned by this user" });
    if (isPrimary) await tx.update(profilePhotos).set({ isPrimary: false }).where(eq(profilePhotos.profileId, profile[0].id));
    const existing = await tx.select({ id: profilePhotos.id }).from(profilePhotos).where(and(eq(profilePhotos.profileId, profile[0].id), eq(profilePhotos.mediaAssetId, mediaAssetId))).limit(1);
    if (existing[0]) {
      await tx.update(profilePhotos).set({ sortOrder, isPrimary }).where(eq(profilePhotos.id, existing[0].id));
      return existing[0].id;
    }
    const result = await tx.insert(profilePhotos).values({ profileId: profile[0].id, mediaAssetId, sortOrder, isPrimary });
    return Number(result[0].insertId);
  });
}

export async function listProfilePhotos(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const profile = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile[0]) return [];
  return db.select({ id: profilePhotos.id, mediaAssetId: profilePhotos.mediaAssetId, storageKey: mediaAssets.storageKey, visibility: mediaAssets.visibility, sortOrder: profilePhotos.sortOrder, isPrimary: profilePhotos.isPrimary }).from(profilePhotos).innerJoin(mediaAssets, eq(profilePhotos.mediaAssetId, mediaAssets.id)).where(and(eq(profilePhotos.profileId, profile[0].id), eq(mediaAssets.status, "active"))).orderBy(profilePhotos.sortOrder, profilePhotos.createdAt);
}

export async function listVisibleProfilePhotos(viewerUserId: number, subjectUserId: number) {
  const photos = await listProfilePhotos(subjectUserId);
  const relationshipState = await getRelationshipState(viewerUserId, subjectUserId);
  if (relationshipState === "blocked") return [];
  if (viewerUserId === subjectUserId) return photos.filter(photo => photo.visibility !== "restricted");
  if (relationshipState !== "matched") return photos.filter(photo => photo.visibility === "public");
  const profile = await getUserProfile(subjectUserId);
  let consent: Record<string, boolean | undefined> = {};
  let privacy: Record<string, boolean | undefined> = {};
  try { consent = profile?.ownerConsent ? JSON.parse(profile.ownerConsent) as Record<string, boolean | undefined> : {}; } catch { /* malformed owner data denies private photos */ }
  try { privacy = profile?.ownerPrivacy ? JSON.parse(profile.ownerPrivacy) as Record<string, boolean | undefined> : {}; } catch { /* malformed owner data denies private photos */ }
  if (consent.privatePhoto !== true || privacy.privatePhoto === false) return photos.filter(photo => photo.visibility === "public");
  return photos.filter(photo => photo.visibility === "public" || photo.visibility === "owner_only");
}

export async function openConversation(userId: number, otherUserId: number, identityMode: "hidden" | "profile_visible") {
  if (userId === otherUserId) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot message yourself" });
  const relationship = await getRelationshipState(userId, otherUserId);
  if (relationship === "blocked") throw new TRPCError({ code: "FORBIDDEN", message: "Messaging is unavailable" });
  if (relationship !== "matched") throw new TRPCError({ code: "FORBIDDEN", message: "Messaging is available after a mutual match" });
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const userAId = Math.min(userId, otherUserId);
  const userBId = Math.max(userId, otherUserId);
  const existing = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.userAId, userAId), eq(conversations.userBId, userBId))).limit(1);
  if (existing[0]) {
    await db.update(conversations).set({ identityMode, status: "active" }).where(eq(conversations.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(conversations).values({ userAId, userBId, identityMode, status: "active" });
  return Number(result[0].insertId);
}

export async function listUserConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: conversations.id, identityMode: conversations.identityMode, status: conversations.status, updatedAt: conversations.updatedAt }).from(conversations).where(and(or(eq(conversations.userAId, userId), eq(conversations.userBId, userId)), eq(conversations.status, "active"))).orderBy(desc(conversations.updatedAt)).limit(100);
}

export async function createMessage(userId: number, conversationId: number, body: string, status: "published" | "quarantined" | "blocked" = "published") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const conversation = await db.select({ id: conversations.id, userAId: conversations.userAId, userBId: conversations.userBId, status: conversations.status }).from(conversations).where(and(eq(conversations.id, conversationId), or(eq(conversations.userAId, userId), eq(conversations.userBId, userId)))).limit(1);
  if (!conversation[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation was not found" });
  if (conversation[0].status !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "Conversation is closed" });
  const result = await db.transaction(async tx => {
    const inserted = await tx.insert(messages).values({ conversationId, senderId: userId, body, status });
    await tx.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
    return inserted;
  });
  return Number(result[0].insertId);
}

export async function listConversationMessages(userId: number, conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  const conversation = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.id, conversationId), or(eq(conversations.userAId, userId), eq(conversations.userBId, userId)))).limit(1);
  if (!conversation[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation was not found" });
  return db.select({ id: messages.id, senderId: messages.senderId, body: messages.body, status: messages.status, createdAt: messages.createdAt }).from(messages).where(and(eq(messages.conversationId, conversationId), eq(messages.status, "published"))).orderBy(messages.createdAt).limit(200);
}

export async function setUserBlock(blockerUserId: number, blockedUserId: number, reason?: string) {
  if (blockerUserId === blockedUserId) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot block yourself" });
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select({ id: userBlocks.id }).from(userBlocks).where(and(eq(userBlocks.blockerUserId, blockerUserId), eq(userBlocks.blockedUserId, blockedUserId))).limit(1);
  if (existing[0]) {
    await db.update(userBlocks).set({ status: "active", reason: reason ?? null, revokedAt: null }).where(eq(userBlocks.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(userBlocks).values({ blockerUserId, blockedUserId, reason: reason ?? null, status: "active" });
  return Number(result[0].insertId);
}

export async function revokeUserBlock(blockerUserId: number, blockedUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(userBlocks).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(userBlocks.blockerUserId, blockerUserId), eq(userBlocks.blockedUserId, blockedUserId), eq(userBlocks.status, "active")));
  assertMutationChanged(result, "User block");
}

export async function createUserReport(input: { reporterUserId: number; reportedUserId: number; reportType: typeof userReports.$inferInsert["reportType"]; details?: string }) {
  if (input.reporterUserId === input.reportedUserId) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot report yourself" });
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const review = await tx.insert(reviewCases).values({ caseType: "moderation", severity: input.reportType === "scam" || input.reportType === "unsafe_behavior" ? "high" : "medium", subjectType: "user", subjectId: input.reportedUserId, summary: input.details?.trim() || `User report: ${input.reportType}`, source: "user_report", assignedTo: null });
    const reviewCaseId = Number(review[0].insertId);
    const report = await tx.insert(userReports).values({ ...input, details: input.details?.trim() || null, reviewCaseId, status: "open" });
    return { reportId: Number(report[0].insertId), reviewCaseId };
  });
}

export async function submitVerification(input: { userId: number; provider: string; evidenceAssetId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const profile = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, input.userId)).limit(1);
    if (!profile[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Create a profile before submitting verification" });
    const pending = await tx.select({ id: verificationSubmissions.id }).from(verificationSubmissions).where(and(eq(verificationSubmissions.userId, input.userId), eq(verificationSubmissions.status, "pending"))).limit(1);
    if (pending[0]) throw new TRPCError({ code: "CONFLICT", message: "A verification submission is already pending" });
    if (input.evidenceAssetId) {
      const evidence = await tx.select({ id: mediaAssets.id }).from(mediaAssets).where(and(eq(mediaAssets.id, input.evidenceAssetId), eq(mediaAssets.ownerUserId, input.userId), eq(mediaAssets.purpose, "verification_evidence"), eq(mediaAssets.visibility, "restricted"), eq(mediaAssets.status, "active"))).limit(1);
      if (!evidence[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Verification evidence is not owned by this user or is not restricted" });
    }
    const review = await tx.insert(reviewCases).values({ caseType: "verification", severity: "medium", subjectType: "user", subjectId: input.userId, summary: "Verification submission awaiting review", source: input.provider.trim() || "manual", assignedTo: null });
    const reviewCaseId = Number(review[0].insertId);
    const result = await tx.insert(verificationSubmissions).values({ userId: input.userId, provider: input.provider.trim() || "manual", evidenceAssetId: input.evidenceAssetId ?? null, reviewCaseId, status: "pending" });
    await tx.update(profiles).set({ verificationState: "pending" }).where(eq(profiles.userId, input.userId));
    return { submissionId: Number(result[0].insertId), reviewCaseId };
  });
}

export async function listVerificationSubmissions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(verificationSubmissions).where(eq(verificationSubmissions.userId, userId)).orderBy(desc(verificationSubmissions.submittedAt)).limit(20);
}
