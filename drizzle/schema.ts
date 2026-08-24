import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const safetyRules = mysqlTable("safety_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  ruleType: mysqlEnum("ruleType", ["bad_word", "phone_number", "link_domain", "spam", "personal_data", "threat", "scam"]).notNull(),
  pattern: text("pattern").notNull(),
  scope: varchar("scope", { length: 120 }).notNull().default("posts,comments,messages,profiles"),
  language: varchar("language", { length: 32 }).notNull().default("all"),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  action: mysqlEnum("action", ["allow", "warn", "mask", "replace", "block", "quarantine", "rate_limit", "create_case", "escalate_human"]).notNull().default("block"),
  version: int("version").notNull().default(1),
  isActive: boolean("isActive").notNull().default(false),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const blockedDomains = mysqlTable("blocked_domains", {
  id: int("id").autoincrement().primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  reason: text("reason"),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull().default("high"),
  isActive: boolean("isActive").notNull().default(true),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const safetyRuleVersions = mysqlTable("safety_rule_versions", {
  id: int("id").autoincrement().primaryKey(),
  ruleId: int("ruleId").notNull(),
  version: int("version").notNull(),
  pattern: text("pattern").notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  changedBy: int("changedBy"),
  changeReason: text("changeReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const planEntitlements = mysqlTable("plan_entitlements", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  key: varchar("key", { length: 120 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userSubscriptions = mysqlTable("user_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planId: int("planId").notNull(),
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).notNull().default("active"),
  startsAt: timestamp("startsAt").defaultNow().notNull(),
  endsAt: timestamp("endsAt"),
  changedBy: int("changedBy"),
  changeReason: text("changeReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const profileFieldPolicies = mysqlTable("profile_field_policies", {
  id: int("id").autoincrement().primaryKey(),
  fieldKey: varchar("fieldKey", { length: 120 }).notNull().unique(),
  freeAccess: boolean("freeAccess").notNull().default(false),
  basicAccess: boolean("basicAccess").notNull().default(false),
  advancedAccess: boolean("advancedAccess").notNull().default(false),
  requiresOwnerConsent: boolean("requiresOwnerConsent").notNull().default(true),
  isSensitive: boolean("isSensitive").notNull().default(false),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const communities = mysqlTable("communities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  categoryType: mysqlEnum("categoryType", ["official", "religion", "country"]).notNull(),
  status: mysqlEnum("status", ["coming_soon", "active", "archived"]).notNull().default("coming_soon"),
  description: text("description"),
  eligibility: text("eligibility"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const communityMemberships = mysqlTable("community_memberships", {
  id: int("id").autoincrement().primaryKey(),
  communityId: int("communityId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["active", "left", "restricted"]).notNull().default("active"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  leftAt: timestamp("leftAt"),
});

export const communityModerators = mysqlTable("community_moderators", {
  id: int("id").autoincrement().primaryKey(),
  communityId: int("communityId").notNull(),
  userId: int("userId").notNull(),
  assignedBy: int("assignedBy"),
  isActive: boolean("isActive").notNull().default(true),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});

export const reviewCases = mysqlTable("review_cases", {
  id: int("id").autoincrement().primaryKey(),
  caseType: mysqlEnum("caseType", ["moderation", "verification", "support", "incident", "agent_review"]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  status: mysqlEnum("status", ["open", "assigned", "escalated", "resolved", "appealed"]).notNull().default("open"),
  subjectType: varchar("subjectType", { length: 40 }),
  subjectId: int("subjectId"),
  summary: text("summary").notNull(),
  assignedTo: int("assignedTo"),
  source: varchar("source", { length: 40 }).notNull().default("system"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const reviewCaseEvidence = mysqlTable("review_case_evidence", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  evidenceType: varchar("evidenceType", { length: 60 }).notNull(),
  evidenceReference: varchar("evidenceReference", { length: 1000 }).notNull(),
  source: varchar("source", { length: 80 }).notNull().default("operations"),
  redactionState: mysqlEnum("redactionState", ["redacted", "restricted"]).notNull().default("redacted"),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
  addedBy: int("addedBy"),
});

export const humanReviews = mysqlTable("human_reviews", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  reviewerId: int("reviewerId"),
  decision: varchar("decision", { length: 60 }),
  reasonCode: varchar("reasonCode", { length: 80 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const verificationReviewDetails = mysqlTable("verification_review_details", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull().unique(),
  resubmissionReason: text("resubmissionReason"),
  fallbackProvider: varchar("fallbackProvider", { length: 120 }),
  fallbackOutcome: text("fallbackOutcome"),
  appealNotes: text("appealNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["open", "assigned", "waiting", "escalated", "resolved"]).notNull().default("open"),
  priority: mysqlEnum("priority", ["normal", "high", "urgent"]).notNull().default("normal"),
  summary: text("summary").notNull(),
  slaDueAt: timestamp("slaDueAt"),
  escalationReason: varchar("escalationReason", { length: 200 }),
  assignedTo: int("assignedTo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const incidentRecords = mysqlTable("incident_records", {
  id: int("id").autoincrement().primaryKey(),
  incidentType: varchar("incidentType", { length: 80 }).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull().default("high"),
  status: mysqlEnum("status", ["open", "contained", "resolved", "postmortem"]).notNull().default("open"),
  ownerId: int("ownerId"),
  isFrozen: boolean("isFrozen").notNull().default(false),
  evidenceReference: text("evidenceReference"),
  escalationReason: varchar("escalationReason", { length: 200 }),
  summary: text("summary").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const agentDecisions = mysqlTable("agent_decisions", {
  id: int("id").autoincrement().primaryKey(),
  agentType: varchar("agentType", { length: 80 }).notNull(),
  caseId: int("caseId"),
  recommendation: varchar("recommendation", { length: 80 }).notNull(),
  confidence: varchar("confidence", { length: 20 }).notNull(),
  modelVersion: varchar("modelVersion", { length: 80 }),
  requiresHuman: boolean("requiresHuman").notNull().default(true),
  persistedToReview: boolean("persistedToReview").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const telegramUpdateReceipts = mysqlTable("telegram_update_receipts", {
  id: int("id").autoincrement().primaryKey(),
  updateId: varchar("updateId", { length: 64 }).notNull().unique(),
  operatorId: varchar("operatorId", { length: 64 }).notNull(),
  command: varchar("command", { length: 160 }).notNull(),
  processedAt: timestamp("processedAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorType: varchar("actorType", { length: 40 }).notNull(),
  actorId: int("actorId"),
  action: varchar("action", { length: 120 }).notNull(),
  resourceType: varchar("resourceType", { length: 80 }).notNull(),
  resourceId: int("resourceId"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SafetyRule = typeof safetyRules.$inferSelect;
export type Community = typeof communities.$inferSelect;
export type ReviewCase = typeof reviewCases.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type ProfileFieldPolicy = typeof profileFieldPolicies.$inferSelect;
