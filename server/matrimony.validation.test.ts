import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function userContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "matrimony-test-user",
      email: "user@example.com",
      name: "Test User",
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("matrimony invariants", () => {
  it("rejects self-match requests before database access", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(caller.matrimony.requestMatch({ userId: 42 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects self-block and self-report attempts", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(caller.matrimony.blockUser({ userId: 42 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.matrimony.reportUser({ userId: 42, reportType: "other" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects malformed report idempotency keys at the contract boundary", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(caller.matrimony.reportUser({ userId: 43, reportType: "other", requestId: "short" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects malformed interest and provider input at the contract boundary", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(caller.matrimony.replaceMyInterests({ interestKeys: [""] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.matrimony.submitVerification({ provider: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
