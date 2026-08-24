import "dotenv/config";
import express from "express";
import { parse as parseCookieHeader } from "cookie";
import { randomBytes } from "crypto";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerTelegramWebhookRoutes } from "../telegramWebhook";
import { ensureCorePolicyDefaults, getCorePolicyReadiness } from "../db";
import { validateStartupConfiguration } from "./env";
import { applyCorsHeaders, isTrustedMutationOrigin } from "./httpSecurity";
import { createRateLimiter } from "./rateLimit";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  validateStartupConfiguration();
  const app = express();
  const server = createServer(app);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerTelegramWebhookRoutes(app);
  // User media uploads use presigned storage URLs; API bodies stay intentionally small.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "256kb", extended: true }));
  app.use("/api", (request, response, next) => {
    response.setHeader("X-NikahSaathi-API-Version", "1");
    const requestedVersion = request.headers["x-nikahsaathi-api-version"];
    if (requestedVersion && requestedVersion !== "1") return response.status(400).json({ error: "Unsupported API version", supported: ["1"] });
    next();
  });
  app.use("/api/trpc", createRateLimiter({ windowMs: 60_000, max: 120, keyPrefix: "trpc" }));
  app.use("/api/trpc", (request, response, next) => {
    const corsApplied = applyCorsHeaders(request, (name, value) => response.setHeader(name, value));
    if (request.method === "OPTIONS") return corsApplied ? response.sendStatus(204) : response.status(403).json({ error: "Origin is not allowed" });
    if (request.method === "POST" && !isTrustedMutationOrigin(request)) return response.status(403).json({ error: "Origin is not allowed" });
    const cookies = parseCookieHeader(request.headers.cookie ?? "");
    const csrfToken = cookies.ns_csrf ?? randomBytes(24).toString("hex");
    const forwardedProto = request.headers["x-forwarded-proto"];
    const secure = request.protocol === "https" || (typeof forwardedProto === "string" && forwardedProto.split(",")[0]?.trim() === "https");
    response.setHeader("Set-Cookie", `ns_csrf=${csrfToken}; Path=/; Max-Age=${60 * 60 * 24}; SameSite=${secure ? "None" : "Lax"}${secure ? "; Secure" : ""}`);
    const usesBearerAuth = Boolean(request.headers.authorization?.startsWith("Bearer "));
    if (request.method === "POST" && !usesBearerAuth && cookies.ns_csrf !== request.headers["x-csrf-token"]) return response.status(403).json({ error: "CSRF token is required" });
    next();
  });
  app.get("/api/health/live", (_request, response) => response.json({ ok: true }));
  app.get("/api/health/ready", async (_request, response) => {
    const readiness = await getCorePolicyReadiness();
    return response.status(readiness.ready ? 200 : 503).json(readiness);
  });
  try {
    const bootstrap = await ensureCorePolicyDefaults();
    console.log("[Policy] Core defaults checked", bootstrap);
  } catch (error) {
    console.error("[Policy] Core default bootstrap failed", error);
  }
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = process.env.NODE_ENV === "development" ? await findAvailablePort(preferredPort) : preferredPort;

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy in development, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
