import { describe, expect, it } from "vitest";
import { applySafetyDecision, evaluateSafetyRules, findBlockedDomains, normalizeSafetyInput } from "./safetyEngine";

describe("safety engine", () => {
  const rules = [
    { id: 1, name: "Phone numbers", ruleType: "phone_number", pattern: "\\+?91?9876543210", scope: "posts,comments,messages,profiles", language: "all", severity: "high" as const, action: "block" as const, isActive: true },
    { id: 2, name: "Threats", ruleType: "threat", pattern: "threat", scope: "messages", language: "all", severity: "critical" as const, action: "escalate_human" as const, isActive: true },
    { id: 3, name: "Invalid draft", ruleType: "bad_word", pattern: "[", scope: "posts", language: "all", severity: "high" as const, action: "block" as const, isActive: true },
  ];

  it("normalizes obfuscated number separators", () => {
    expect(normalizeSafetyInput("+91 987-654-3210")).toBe("+919876543210");
  });

  it("applies only to the requested surface and orders critical matches first", () => {
    const matches = evaluateSafetyRules("threat +91 987-654-3210", "messages", rules);
    expect(matches.map(match => match.name)).toEqual(["Threats", "Phone numbers"]);
  });

  it("ignores invalid draft regexes instead of crashing content processing", () => {
    expect(evaluateSafetyRules("anything", "posts", rules)).toEqual([]);
  });

  it("matches blocked domains and their subdomains", () => {
    expect(findBlockedDomains("Visit https://offers.example.com/deal", ["example.com"])).toEqual(["https://offers.example.com/deal"]);
  });

  it("masks only when policy explicitly requests masking and blocks otherwise", () => {
    const match = { ruleId: 4, name: "Contact handle", ruleType: "personal_data", severity: "medium" as const, action: "mask" as const, matchedText: "@handle" };
    expect(applySafetyDecision("Say @handle", [match])).toMatchObject({ allowed: true, safeText: "Say [hidden]" });
    expect(applySafetyDecision("unsafe", [{ ...match, action: "block" as const }])).toMatchObject({ allowed: false, safeText: null });
  });
});
