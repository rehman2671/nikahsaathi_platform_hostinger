import type { Express } from "express";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { getActiveMediaAssetByKey } from "../db";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const asset = await getActiveMediaAssetByKey(key);
    if (!asset) {
      res.status(404).send("Storage asset not found");
      return;
    }

    let user: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
    if (asset.visibility !== "public") {
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).send("Authentication required");
        return;
      }
      const ownerAllowed = user.id === asset.ownerUserId;
      const restrictedAdminAllowed = asset.visibility === "restricted" && user.role === "admin";
      if (!ownerAllowed && !restrictedAdminAllowed) {
        res.status(403).send("Storage access denied");
        return;
      }
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
