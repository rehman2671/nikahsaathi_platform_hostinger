import type { Request } from "express";

function configuredOrigins() {
  return new Set((process.env.CORS_ALLOWED_ORIGINS ?? "").split(",").map(origin => origin.trim()).filter(Boolean));
}

export function allowedWebOrigins(req: Request) {
  const origins = configuredOrigins();
  const origin = req.headers.origin;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto?.split(",")[0]?.trim() || req.protocol;
  if (origin) origins.add(origin === `${protocol}://${req.get("host")}` ? origin : "");
  origins.delete("");
  return origins;
}

export function isTrustedMutationOrigin(req: Request) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return allowedWebOrigins(req).has(origin);
}

export function applyCorsHeaders(req: Request, setHeader: (name: string, value: string) => void) {
  const origin = req.headers.origin;
  if (!origin || !allowedWebOrigins(req).has(origin)) return false;
  setHeader("Access-Control-Allow-Origin", origin);
  setHeader("Access-Control-Allow-Credentials", "true");
  setHeader("Access-Control-Allow-Headers", "content-type,authorization,x-csrf-token");
  setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  setHeader("Vary", "Origin");
  return true;
}
