import { afterEach, describe, expect, it } from "vitest";
import { allowedWebOrigins, applyCorsHeaders, isTrustedMutationOrigin } from "./_core/httpSecurity";

describe("split-origin HTTP security", () => {
  afterEach(() => {
    delete process.env.CORS_ALLOWED_ORIGINS;
  });

  it("allows only explicitly configured frontend origins", () => {
    process.env.CORS_ALLOWED_ORIGINS = "https://app.example.com, https://web.example.com";
    const request = { headers: { origin: "https://app.example.com", "x-forwarded-proto": "https" }, protocol: "https", get: () => "api.example.com" } as never;
    expect(allowedWebOrigins(request)).toEqual(new Set(["https://app.example.com", "https://web.example.com"]));
    expect(isTrustedMutationOrigin(request)).toBe(true);
  });

  it("does not authorize an unconfigured cross-origin mutation", () => {
    process.env.CORS_ALLOWED_ORIGINS = "https://app.example.com";
    const request = { headers: { origin: "https://attacker.example.com" }, protocol: "https", get: () => "api.example.com" } as never;
    expect(isTrustedMutationOrigin(request)).toBe(false);
  });

  it("emits credentialed CORS headers only for an allowed origin", () => {
    process.env.CORS_ALLOWED_ORIGINS = "https://app.example.com";
    const request = { headers: { origin: "https://app.example.com" }, protocol: "https", get: () => "api.example.com" } as never;
    const headers = new Map<string, string>();
    expect(applyCorsHeaders(request, (name, value) => headers.set(name, value))).toBe(true);
    expect(headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");
    expect(headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(headers.get("Access-Control-Allow-Headers")).toContain("x-csrf-token");
  });
});
