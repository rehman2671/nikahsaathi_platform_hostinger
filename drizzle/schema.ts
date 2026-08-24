import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  index,
  uniqueIndex,
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

export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull().references(() => users.id),
  communityId: int("communityId"),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["draft", "published", "quarantined", "blocked"]).notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  communityFeedIndex: index("posts_community_status_created_idx").on(table.communityId, table.status, table.createdAt),
  authorIndex: index("posts_author_created_idx").on(table.authorId, table.createdAt),
}));

export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull().references(() => posts.id),
  authorId: int("authorId").notNull().references(() => users.id),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["published", "quarantined", "blocked"]).notNull().default("published"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  postThreadIndex: index("comments_post_status_created_idx").on(table.postId, table.status, table.createdAt),
  authorIndex: index("comments_author_created_idx").on(table.authorId, table.createdAt),
}));

export const mediaAssets = mysqlTable("media_assets", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull().references(() => users.id),
  storageKey: varchar("storageKey", { length: 1000 }).notNull().unique(),
  purpose: mysqlEnum("purpose", ["profile_photo", "verification_evidence", "incident_evidence", "other"]).notNull(),
  visibility: mysqlEnum("visibility", ["public", "owner_only", "restricted"]).notNull().default("owner_only"),
  status: mysqlEnum("status", ["active", "deleted", "quarantined"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  ownerPurposeIndex: index("media_assets_owner_purpose_status_idx").on(table.ownerUserId, table.purpose, table.status),
}));

export const verificationSubmissions = mysqlTable("verification_submissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "resubmission_required"]).notNull().default("pending"),
  provider: varchar("provider", { length: 120 }).notNull().default("manual"),
  evidenceAssetId: int("evidenceAssetId").references(() => mediaAssets.id),
  reviewCaseId: int("reviewCaseId"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: int("reviewedBy").references(() => users.id),
  reviewerNotes: text("reviewerNotes"),
}, table => ({
  userStatusIndex: index("verification_submissions_user_status_idx").on(table.userId, table.status, table.submittedAt),
  pendingIndex: index("verification_submissions_status_submitted_idx").on(table.status, table.submittedAt),
}));

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  profileStatus: mysqlEnum("profileStatus", ["draft", "pending_review", "active", "paused", "blocked"]).notNull().default("draft"),
  verificationState: mysqlEnum("verificationState", ["unverified", "pending", "verified", "expired"]).notNull().default("unverified"),
  displayName: varchar("displayName", { length: 160 }),
  introduction: text("introduction"),
  religion: varchar("religion", { length: 80 }),
  country: varchar("country", { length: 80 }),
  city: varchar("city", { length: 120 }),
  profession: varchar("profession", { length: 160 }),
  education: varchar("education", { length: 200 }),
  languages: varchar("languages", { length: 255 }),
  marriageExpectations: text("marriageExpectations"),
  ownerConsent: text("ownerConsent"),
  ownerPrivacy: text("ownerPrivacy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  profileUserUnique: uniqueIndex("profiles_user_unique").on(table.userId),
  profileDiscoveryIndex: index("profiles_status_country_religion_idx").on(table.profileStatus, table.country, table.religion, table.updatedAt),
}));

export const userInterests = mysqlTable("user_interests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  interestKey: varchar("interestKey", { length: 80 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userInterestUnique: uniqueIndex("user_interests_user_interest_unique").on(table.userId, table.interestKey),
  userInterestIndex: index("user_interests_user_created_idx").on(table.userId, table.createdAt),
}));

export const userBlocks = mysqlTable("user_blocks", {
  id: int("id").autoincrement().primaryKey(),
  blockerUserId: int("blockerUserId").notNull().references(() => users.id),
  blockedUserId: int("blockedUserId").notNull().references(() => users.id),
  reason: varchar("reason", { length: 200 }),
  status: mysqlEnum("status", ["active", "revoked"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
}, table => ({
  blockPairUnique: uniqueIndex("user_blocks_pair_unique").on(table.blockerUserId, table.blockedUserId),
  blockerStatusIndex: index("user_blocks_blocker_status_idx").on(table.blockerUserId, table.status, table.createdAt),
  blockedStatusIndex: index("user_blocks_blocked_status_idx").on(table.blockedUserId, table.status),
}));

export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  userAId: int("userAId").notNull().references(() => users.id),
  userBId: int("userBId").notNull().references(() => users.id),
  requestedBy: int("requestedBy").notNull().references(() => users.id),
  status: mysqlEnum("status", ["suggested", "requested", "accepted", "rejected", "blocked"]).notNull().default("suggested"),
  score: int("score"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  matchPairUnique: uniqueIndex("matches_pair_unique").on(table.userAId, table.userBId),
  matchUserStatusIndex: index("matches_user_status_idx").on(table.userAId, table.status, table.updatedAt),
  matchOtherStatusIndex: index("matches_other_status_idx").on(table.userBId, table.status, table.updatedAt),
}));

export const userReports = mysqlTable("user_reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterUserId: int("reporterUserId").notNull().references(() => users.id),
  reportedUserId: int("reportedUserId").notNull().references(() => users.id),
  reportType: mysqlEnum("reportType", ["harassment", "scam", "impersonation", "unsafe_behavior", "spam", "other"]).notNull(),
  details: text("details"),
  status: mysqlEnum("status", ["open", "reviewing", "resolved", "dismissed"]).notNull().default("open"),
  reviewCaseId: int("reviewCaseId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  reporterIndex: index("user_reports_reporter_created_idx").on(table.reporterUserId, table.createdAt),
  reportedIndex: index("user_reports_reported_status_idx").on(table.reportedUserId, table.status, table.createdAt),
}));

export const profilePhotos = mysqlTable("profile_photos", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => profiles.id),
  mediaAssetId: int("mediaAssetId").notNull().references(() => mediaAssets.id),
  sortOrder: int("sortOrder").notNull().default(0),
  isPrimary: boolean("isPrimary").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  profileMediaUnique: uniqueIndex("profile_photos_profile_media_unique").on(table.profileId, table.mediaAssetId),
  profileOrderIndex: index("profile_photos_profile_order_idx").on(table.profileId, table.sortOrder, table.createdAt),
}));

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userAId: int("userAId").notNull().references(() => users.id),
  userBId: int("userBId").notNull().references(() => users.id),
  identityMode: mysqlEnum("identityMode", ["hidden", "profile_visible"]).notNull().default("hidden"),
  status: mysqlEnum("status", ["active", "closed", "blocked"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  conversationPairUnique: uniqueIndex("conversations_pair_unique").on(table.userAId, table.userBId),
  conversationUserStatusIndex: index("conversations_user_status_idx").on(table.userAId, table.status, table.updatedAt),
  conversationOtherStatusIndex: index("conversations_other_status_idx").on(table.userBId, table.status, table.updatedAt),
}));

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id),
  senderId: int("senderId").notNull().references(() => users.id),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["published", "quarantined", "blocked"]).notNull().default("published"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  conversationMessageIndex: index("messages_conversation_created_idx").on(table.conversationId, table.createdAt),
  senderIndex: index("messages_sender_created_idx").on(table.senderId, table.createdAt),
}));

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
}, table => ({
  planKeyUnique: uniqueIndex("plan_entitlements_plan_key_unique").on(table.planId, table.key),
}));

export const userSubscriptions = mysqlTable("user_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planId: int("planId").notNull(),
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).notNull().default("active"),
  activeKey: varchar("activeKey", { length: 64 }).unique(),
  startsAt: timestamp("startsAt").defaultNow().notNull(),
  endsAt: timestamp("endsAt"),
  changedBy: int("changedBy"),
  changeReason: text("changeReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userStatusIndex: index("user_subscriptions_user_status_idx").on(table.userId, table.status, table.createdAt),
}));

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
}, table => ({
  communityUserUnique: uniqueIndex("community_memberships_community_user_unique").on(table.communityId, table.userId),
  communityStatusIndex: index("community_memberships_community_status_idx").on(table.communityId, table.status),
}));

export const communityModerators = mysqlTable("community_moderators", {
  id: int("id").autoincrement().primaryKey(),
  communityId: int("communityId").notNull(),
  userId: int("userId").notNull(),
  assignedBy: int("assignedBy"),
  isActive: boolean("isActive").notNull().default(true),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
}, table => ({
  communityModeratorUnique: uniqueIndex("community_moderators_community_user_unique").on(table.communityId, table.userId),
  communityModeratorStatusIndex: index("community_moderators_community_active_idx").on(table.communityId, table.isActive),
}));

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
}, table => ({
  queueIndex: index("review_cases_type_status_severity_idx").on(table.caseType, table.status, table.severity, table.updatedAt),
}));

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
  status: mysqlEnum("status", ["received", "processing", "processed", "failed", "dead_letter"]).notNull().default("received"),
  attempts: int("attempts").notNull().default(0),
  lastError: text("lastError"),
  nextAttemptAt: timestamp("nextAttemptAt"),
  processedAt: timestamp("processedAt"),
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
