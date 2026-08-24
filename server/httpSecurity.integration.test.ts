import { describe, expect, it } from "vitest";
import { sdk } from "./_core/sdk";

const baseUrl = "http://127.0.0.1:3000/api/trpc/auth.me";
const mutationUrl = "http://127.0.0.1:3000/api/trpc/matrimony.replaceMyInterests";

describe("live HTTP security boundary", () => {
  it("advertises API v1 and rejects unsupported requested versions", async () => {
    const live = await fetch("http://127.0.0.1:3000/api/health/live");
    expect(live.status).toBe(200);
    expect(live.headers.get("x-nikahsaathi-api-version")).toBe("1");
    const unsupported = await fetch("http://127.0.0.1:3000/api/health/live", { headers: { "x-nikahsaathi-api-version": "2" } });
    expect(unsupported.status).toBe(400);
  });
  it("answers same-host CORS preflight with credential headers", async () => {
    const response = await fetch(baseUrl, { method: "OPTIONS", headers: { origin: "http://127.0.0.1:3000", "access-control-request-method": "POST" } });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:3000");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("rejects an untrusted cross-origin mutation before tRPC auth", async () => {
    const response = await fetch(baseUrl, { method: "POST", headers: { origin: "https://attacker.example.com", "content-type": "application/json" }, body: "{}" });
    expect(response.status).toBe(403);
  });

  it("rejects cookie-style mutations without the double-submit token", async () => {
    const response = await fetch(baseUrl, { method: "POST", headers: { origin: "http://127.0.0.1:3000", cookie: "ns_csrf=known-token", "content-type": "application/json" }, body: "{}" });
    expect(response.status).toBe(403);
    expect(await response.text()).toContain("CSRF token is required");
  });

  it("accepts a valid CSRF token on a real cookie-authenticated tRPC mutation", async () => {
    const openId = process.env.OWNER_OPEN_ID;
    expect(openId).toBeTruthy();
    const session = await sdk.createSessionToken(openId!, { name: process.env.OWNER_NAME ?? "Owner" });
    const response = await fetch(mutationUrl, { method: "POST", headers: { origin: "http://127.0.0.1:3000", cookie: `app_session_id=${session}; ns_csrf=known-token`, "x-csrf-token": "known-token", "content-type": "application/json" }, body: JSON.stringify({ json: { interestKeys: [] } }) });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { result?: { data?: { json?: { interestKeys?: string[] } } } };
    expect(payload.result?.data?.json?.interestKeys).toEqual([]);
  }, 15_000);
});
