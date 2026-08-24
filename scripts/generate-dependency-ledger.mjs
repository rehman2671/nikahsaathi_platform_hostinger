import fs from "node:fs";

const audit = JSON.parse(fs.readFileSync("/tmp/nikahsaathi-audit.json", "utf8"));
const grouped = new Map();
for (const advisory of Object.values(audit.advisories ?? {})) {
  const key = `${advisory.module_name}|${advisory.severity}`;
  const current = grouped.get(key) ?? { module: advisory.module_name, severity: advisory.severity, paths: new Set() };
  for (const finding of advisory.findings ?? []) for (const path of finding.paths ?? []) current.paths.add(path);
  grouped.set(key, current);
}
const runtime = new Set(["@trpc/server", "express", "fast-xml-parser", "path-to-regexp", "qs", "lodash", "lodash-es", "dompurify", "mdast-util-to-hast"]);
const rank = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
const code = String.fromCharCode(96);
const rows = [...grouped.values()].sort((a, b) => (rank[a.severity] - rank[b.severity]) || a.module.localeCompare(b.module));
const lines = ["", "## Formal triage ledger", "", "Generated from " + code + "pnpm audit --json" + code + " on 2026-08-25. Duplicate records are grouped by package family and severity; representative affected paths are retained below.", "", "| Package family | Severity | Affected paths | Impact | Owner | Decision | Target date |", "|---|---:|---:|---|---|---|---|"];
for (const row of rows) {
  const isRuntime = runtime.has(row.module);
  const impact = isRuntime ? "runtime" : "development/build or indirect runtime chain";
  const owner = isRuntime ? "Backend & Security" : "Platform Engineering";
  const decision = row.severity === "critical" || row.severity === "high" ? "Remediate before production exposure; no blanket override" : "Upgrade parent chain; risk-accept only after review";
  const target = row.severity === "critical" || row.severity === "high" ? "2026-09-15" : "2026-09-30";
  const paths = [...row.paths].slice(0, 3).map(path => code + path.replaceAll("|", "\\|") + code).join("<br>");
  lines.push("| " + code + row.module + code + " | " + row.severity + " | " + row.paths.size + " path(s)<br>" + (paths || "(path unavailable)") + " | " + impact + " | " + owner + " | " + decision + " | " + target + " |");
}
lines.push("", "### Decision rules", "", "Critical and high runtime-chain findings are release blockers and require a parent-package upgrade or a compensating control approved by Backend & Security. Moderate and low findings require parent-chain review and are not silently suppressed. Re-run the audit after every dependency change and update this ledger with closure evidence or a renewed owner and target date.", "");
const report = fs.readFileSync("DEPENDENCY_AUDIT_TRIAGE.md", "utf8").replace(/\n## Formal triage ledger[\\s\\S]*$/m, "").trimEnd();
fs.writeFileSync("DEPENDENCY_AUDIT_TRIAGE.md", report + "\n" + lines.join("\n"));
