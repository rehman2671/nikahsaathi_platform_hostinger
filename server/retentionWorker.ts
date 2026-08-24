import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { runRetentionSweep } from "./db";
import { ENV } from "./_core/env";

export function registerRetentionWorkerRoute(app: Express) {
  app.post("/api/scheduled/retentionSweep", async (request: Request, response: Response) => {
    try {
      const user = await sdk.authenticateRequest(request);
      if (!user.isCron || !user.taskUid) return response.status(403).json({ error: "cron-only" });
      const requestedDryRun = request.body && typeof request.body === "object" && request.body.dryRun === true;
      const dryRun = requestedDryRun || !ENV.retentionWorkerEnabled || ENV.retentionLegalHold;
      const result = await runRetentionSweep({ dryRun, maxRows: 500 });
      return response.json({ ok: true, taskUid: user.taskUid, ...result });
    } catch (error) {
      return response.status(500).json({ error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() });
    }
  });
}
