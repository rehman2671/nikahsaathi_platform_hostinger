import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("rate-limit middleware", () => {
  it("uses the bounded local fallback when shared storage is disabled", async () => {
    vi.stubEnv("SHARED_RATE_LIMIT_ENABLED", "false");
    const { createRateLimiter } = await import("./_core/rateLimit");
    const middleware = createRateLimiter({ windowMs: 60_000, max: 1, keyPrefix: "test" });
    const headers = new Map<string, string>();
    const response = {
      setHeader(name: string, value: string) { headers.set(name, value); },
      status(code: number) { return { json(payload: unknown) { return { code, payload }; } }; },
    } as never;
    const request = { ip: "198.51.100.10", socket: { remoteAddress: undefined } } as never;
    let nextCalls = 0;
    await middleware(request, response, () => { nextCalls += 1; });
    const blocked = await middleware(request, response, () => { nextCalls += 1; });
    expect(nextCalls).toBe(1);
    expect(headers.get("X-RateLimit-Limit")).toBe("1");
    expect(headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(blocked).toMatchObject({ code: 429 });
  });
});
