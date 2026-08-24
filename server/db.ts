import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLogs,
  blockedDomains,
  communities,
  communityMemberships,
  humanReviews,
  profileFieldPolicies,
  reviewCases,
  safetyRuleVersions,
  safetyRules,
  subscriptionPlans,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

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

export async function setSafetyRuleStatus(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(safetyRules).set({ isActive }).where(eq(safetyRules.id, id));
}

export async function createSafetyRuleVersion(input: typeof safetyRuleVersions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(safetyRuleVersions).values(input);
  await db.update(safetyRules).set({ pattern: input.pattern, action: input.action as typeof safetyRules.$inferSelect.action, version: input.version }).where(eq(safetyRules.id, input.ruleId));
}

export async function rollbackSafetyRule(ruleId: number, version: number, actorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const previous = await db.select().from(safetyRuleVersions).where(eq(safetyRuleVersions.ruleId, ruleId)).orderBy(desc(safetyRuleVersions.version));
  const target = previous.find(item => item.version === version);
  if (!target) throw new Error("Rule version not found");
  await db.update(safetyRules).set({ pattern: target.pattern, action: target.action as typeof safetyRules.$inferSelect.action, version: target.version }).where(eq(safetyRules.id, ruleId));
  await db.insert(auditLogs).values({ actorType: "admin", actorId, action: "safety_rule.rollback", resourceType: "safety_rule", resourceId: ruleId, metadata: JSON.stringify({ version }) });
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

export async function setCommunityStatus(id: number, status: "coming_soon" | "active" | "archived") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const target = await db.select().from(communities).where(eq(communities.id, id)).limit(1);
  if (status === "active" && target[0]?.categoryType === "country") {
    const religionCommunities = await db.select({ count: sql<number>`count(*)` }).from(communities).where(eq(communities.categoryType, "religion"));
    if (Number(religionCommunities[0]?.count ?? 0) === 0) throw new Error("Religion communities must be configured before country rollout");
  }
  await db.update(communities).set({ status }).where(eq(communities.id, id));
}

export async function joinCommunity(communityId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const community = await db.select().from(communities).where(eq(communities.id, communityId)).limit(1);
  if (community[0]?.status !== "active") throw new Error("Only active communities can be joined");
  const existing = await db.select().from(communityMemberships).where(sql`${communityMemberships.communityId} = ${communityId} AND ${communityMemberships.userId} = ${userId} AND ${communityMemberships.status} = 'active'`).limit(1);
  if (existing.length) return existing[0].id;
  const result = await db.insert(communityMemberships).values({ communityId, userId, status: "active" });
  return Number(result[0].insertId);
}

export async function leaveCommunity(communityId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(communityMemberships).set({ status: "left", leftAt: new Date() }).where(sql`${communityMemberships.communityId} = ${communityId} AND ${communityMemberships.userId} = ${userId} AND ${communityMemberships.status} = 'active'`);
}

export async function listUserMemberships(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(communityMemberships).where(eq(communityMemberships.userId, userId));
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

export async function recordHumanReview(input: typeof humanReviews.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(humanReviews).values(input);
  if (input.caseId) await db.update(reviewCases).set({ status: "resolved", assignedTo: input.reviewerId ?? null }).where(eq(reviewCases.id, input.caseId));
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

export async function listProfileFieldPolicies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profileFieldPolicies).orderBy(profileFieldPolicies.fieldKey);
}
