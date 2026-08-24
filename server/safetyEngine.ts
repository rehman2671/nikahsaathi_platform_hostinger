export type SafetyAction = "allow" | "warn" | "mask" | "replace" | "block" | "quarantine" | "rate_limit" | "create_case" | "escalate_human";
export type SafetySeverity = "low" | "medium" | "high" | "critical";
export type ContentSurface = "posts" | "comments" | "messages" | "profiles";

export type SafetyRuleDefinition = {
  id: number;
  name: string;
  ruleType: string;
  pattern: string;
  scope: string;
  language: string;
  severity: SafetySeverity;
  action: SafetyAction;
  isActive: boolean;
};

export type SafetyMatch = {
  ruleId: number;
  name: string;
  ruleType: string;
  severity: SafetySeverity;
  action: SafetyAction;
  matchedText: string;
  sourceStart?: number;
  sourceEnd?: number;
};

const severityRank: Record<SafetySeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export function normalizeSafetyInput(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\s\-().]+/g, "")
    .trim();
}

function ruleApplies(rule: SafetyRuleDefinition, surface: ContentSurface) {
  return rule.isActive && rule.scope.split(",").map(item => item.trim()).includes(surface);
}

function safePattern(pattern: string) {
  if (pattern.length > 500) return null;
  try {
    return new RegExp(pattern, "iu");
  } catch {
    return null;
  }
}

function normalizedWithSourceMap(text: string, ruleType: string) {
  const map: number[] = [];
  let value = "";
  for (let index = 0; index < text.length; index += 1) {
    let piece = text[index].normalize("NFKC").toLocaleLowerCase();
    if (ruleType === "phone_number") piece = piece.replace(/[\s\-().]/g, "");
    else if (ruleType === "personal_data") piece = piece.replace(/[\s]/g, "");
    if (/^[\u200B-\u200D\uFEFF]$/.test(piece)) piece = "";
    value += piece;
    for (let offset = 0; offset < piece.length; offset += 1) map.push(index);
  }
  return { value, map };
}

export function evaluateSafetyRules(text: string, surface: ContentSurface, rules: SafetyRuleDefinition[]): SafetyMatch[] {
  return rules
    .filter(rule => ruleApplies(rule, surface))
    .map((rule): SafetyMatch | null => {
      const regex = safePattern(rule.pattern);
      if (!regex) return null;
      const normalized = normalizedWithSourceMap(text, rule.ruleType);
      const match = normalized.value.match(regex);
      if (!match) return null;
      const start = match.index ?? 0;
      const sourceStart = normalized.map[start];
      const lastMapped = normalized.map[start + match[0].length - 1];
      const result: SafetyMatch = { ruleId: rule.id, name: rule.name, ruleType: rule.ruleType, severity: rule.severity, action: rule.action, matchedText: match[0] };
      if (sourceStart !== undefined) result.sourceStart = sourceStart;
      if (lastMapped !== undefined) result.sourceEnd = lastMapped + 1;
      return result;
    })
    .filter((match): match is SafetyMatch => match !== null)
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
}

export function findBlockedDomains(text: string, domains: string[]) {
  const normalizedDomains = domains.map(domain => domain.toLocaleLowerCase().replace(/^www\./, "").trim()).filter(Boolean);
  const urls = text.match(/(?:https?:\/\/|www\.)[^\s<>()]+/gi) ?? [];
  return urls.filter(url => {
    try {
      const parsed = new URL(url.startsWith("www.") ? `https://${url}` : url);
      const hostname = parsed.hostname.toLocaleLowerCase().replace(/^www\./, "");
      return normalizedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  });
}

export function highestSafetyAction(matches: SafetyMatch[]) {
  return matches[0] ?? null;
}

export function applySafetyDecision(text: string, matches: SafetyMatch[], blockedUrls: string[] = []) {
  const highest = highestSafetyAction(matches);
  if (!highest && blockedUrls.length === 0) return { allowed: true, action: "allow" as const, safeText: text, explanation: null };
  if (highest?.action === "mask" || highest?.action === "replace") {
    const safeText = highest.sourceStart !== undefined && highest.sourceEnd !== undefined ? `${text.slice(0, highest.sourceStart)}[hidden]${text.slice(highest.sourceEnd)}` : highest.matchedText ? text.replace(new RegExp(highest.matchedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[hidden]") : text;
    return { allowed: true, action: highest.action, safeText, explanation: "Some content was hidden to protect members." };
  }
  return { allowed: false, action: highest?.action ?? "block", safeText: null, explanation: "This content cannot be shared under the current safety policy." };
}
