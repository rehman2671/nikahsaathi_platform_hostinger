import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextForRole(role: "user" | "admin"): TrpcContext {
  return {
    user: {
      id: 42,
      openId: `test-${role}`,
      email: `${role}@example.com`,
      name: role,
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("operations authorization", () => {
  it("rejects a regular user from the operations overview", async () => {
    const caller = appRouter.createCaller(contextForRole("user"));
    await expect(caller.operations.accessCheck()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin to reach the operations overview", async () => {
    const caller = appRouter.createCaller(contextForRole("admin"));
    await expect(caller.operations.accessCheck()).resolves.toEqual({ allowed: true });
  });

  it.each([
    ["updateSafetyRule", () => appRouter.createCaller(contextForRole("user")).operations.updateSafetyRule({ id: 1, name: "Rule", pattern: "test" })],
    ["createSafetyRuleVersion", () => appRouter.createCaller(contextForRole("user")).operations.createSafetyRuleVersion({ ruleId: 1, version: 2, pattern: "test", action: "block", changeReason: "test" })],
    ["assignCommunityModerator", () => appRouter.createCaller(contextForRole("user")).operations.assignCommunityModerator({ communityId: 1, userId: 2 })],
    ["changeUserSubscription", () => appRouter.createCaller(contextForRole("user")).operations.changeUserSubscription({ userId: 2, planCode: "basic", status: "active", changeReason: "test", confirmation: "CONFIRM" })],
    ["updateProfileFieldPolicy", () => appRouter.createCaller(contextForRole("user")).operations.updateProfileFieldPolicy({ id: 1, freeAccess: true })],
    ["authorizeHighRiskAction", () => appRouter.createCaller(contextForRole("user")).operations.authorizeHighRiskAction({ action: "permanent_ban", confidence: 0.4, humanDecision: "reject", secondConfirmation: "CONFIRM" })],
    ["verificationAction", () => appRouter.createCaller(contextForRole("user")).operations.verificationAction({ caseId: 1, action: "appeal", reason: "member appeal" })],
    ["preserveIncidentEvidence", () => appRouter.createCaller(contextForRole("user")).operations.preserveIncidentEvidence({ id: 1, evidenceReference: "secure-ref" })],
    ["escalateIncident", () => appRouter.createCaller(contextForRole("user")).operations.escalateIncident({ id: 1, reason: "critical escalation" })],
  ])("rejects regular users from %s", async (_name, request) => {
    await expect(request()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin mutation input validation", () => {
  const admin = () => appRouter.createCaller(contextForRole("admin"));

  it("rejects invalid blocked-domain input before persistence", async () => {
    await expect(admin().operations.createBlockedDomain({ domain: "bad domain", severity: "high" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires explicit confirmation for subscription changes", async () => {
    await expect(admin().operations.changeUserSubscription({ userId: 42, planCode: "basic", status: "active", changeReason: "operator request", confirmation: "NOPE" as "CONFIRM" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires explicit confirmation for plan administration", async () => {
    await expect(admin().operations.updateSubscriptionPlan({ id: 1, name: "Basic", confirmation: "NOPE" as "CONFIRM" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires fallback provider details for verification fallback", async () => {
    await expect(admin().operations.verificationAction({ caseId: 1, action: "fallback_provider", reason: "secondary review" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("requires appeal notes for verification appeals", async () => {
    await expect(admin().operations.verificationAction({ caseId: 1, action: "appeal", reason: "appeal opened" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
