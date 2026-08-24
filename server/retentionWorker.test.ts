import { beforeEach, describe, expect, it, vi } from "vitest";

const { runRetentionSweep, authenticateRequest } = vi.hoisted(() => ({ runRetentionSweep: vi.fn(), authenticateRequest: vi.fn() }));
vi.mock("./db", () => ({ runRetentionSweep }));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest } }));

import { registerRetentionWorkerRoute } from "./retentionWorker";

describe("retention worker route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron_retention_1" });
    runRetentionSweep.mockResolvedValue({ dryRun: true, deleted: { rateLimitBuckets: 0, telegramOutbox: 0, telegramReceipts: 0 }, candidates: { rateLimitBuckets: 0, telegramOutbox: 0, telegramReceipts: 0 } });
  });

  it("requires a cron identity and defaults to dry-run", async () => {
    let handler: ((request: any, response: any) => Promise<unknown>) | undefined;
    registerRetentionWorkerRoute({ post: (_path: string, route: typeof handler) => { handler = route; } } as never);
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    await handler?.({ body: {} }, { status, json });
    expect(runRetentionSweep).toHaveBeenCalledWith({ dryRun: true, maxRows: 500 });
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, taskUid: "cron_retention_1", dryRun: true }));
  });

  it("rejects non-cron callers", async () => {
    authenticateRequest.mockResolvedValue({ isCron: false });
    let handler: ((request: any, response: any) => Promise<unknown>) | undefined;
    registerRetentionWorkerRoute({ post: (_path: string, route: typeof handler) => { handler = route; } } as never);
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    await handler?.({ body: {} }, { status, json });
    expect(status).toHaveBeenCalledWith(403);
    expect(runRetentionSweep).not.toHaveBeenCalled();
  });
});
