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
  try {
    return new RegExp(pattern, "iu");
  } catch {
    return null;
  }
}

export function evaluateSafetyRules(text: string, surface: ContentSurface, rules: SafetyRuleDefinition[]): SafetyMatch[] {
  const normalized = normalizeSafetyInput(text);
  return rules
    .filter(rule => ruleApplies(rule, surface))
    .map(rule => {
      const regex = safePattern(rule.pattern);
      if (!regex) return null;
      const match = normalized.match(regex);
      return match ? { ruleId: rule.id, name: rule.name, ruleType: rule.ruleType, severity: rule.severity, action: rule.action, matchedText: match[0] } : null;
    })
    .filter((match): match is SafetyMatch => Boolean(match))
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
    const safeText = highest.matchedText ? text.replace(new RegExp(highest.matchedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[hidden]") : text;
    return { allowed: true, action: highest.action, safeText, explanation: "Some content was hidden to protect members." };
  }
  return { allowed: false, action: highest?.action ?? "block", safeText: null, explanation: "This content cannot be shared under the current safety policy." };
}
