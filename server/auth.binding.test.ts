import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

describe("session application binding", () => {
  it("rejects a validly signed token issued for another application", async () => {
    const token = await new SignJWT({ openId: "cross-app-user", appId: "different-app", name: "Cross App" })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode(ENV.cookieSecret));
    await expect(sdk.verifySession(token)).resolves.toBeNull();
  });
});
