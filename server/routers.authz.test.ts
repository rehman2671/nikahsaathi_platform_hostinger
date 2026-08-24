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
});
