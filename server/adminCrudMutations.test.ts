import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  return {
    user: { id: 7, openId: "crud-admin", email: "admin@example.com", name: "Admin", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin CRUD mutation validation", () => {
  const caller = () => appRouter.createCaller(adminContext());

  it("rejects an invalid community eligibility update before persistence", async () => {
    await expect(caller().operations.updateCommunity({ id: 1, categoryType: "country", eligibility: "x" })).rejects.toThrow("Community eligibility");
  });

  it("rejects invalid moderator removal identifiers before persistence", async () => {
    await expect(caller().operations.removeCommunityModerator({ id: 0, communityId: 1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects invalid blocked-domain update identifiers before persistence", async () => {
    await expect(caller().operations.updateBlockedDomain({ id: 0, severity: "critical" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().operations.setBlockedDomainStatus({ id: 0, isActive: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
