export const DOMAIN_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type DomainSeverity = (typeof DOMAIN_SEVERITIES)[number];

export function normalizeAdminDomain(value: string) {
  const normalized = value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? "";
  if (!/^[a-z0-9.-]+$/.test(normalized) || normalized.length < 3 || normalized.length > 255 || normalized.startsWith(".") || normalized.endsWith(".")) {
    throw new Error("Enter a valid domain without a path or protocol");
  }
  return normalized;
}

export function validateCommunityEligibility(value: string) {
  const normalized = value.trim();
  if (normalized.length < 3 || normalized.length > 2000) throw new Error("Community eligibility must be between 3 and 2000 characters");
  return normalized;
}

export function validatePlanAdminConfirmation(value: string) {
  return value.trim().toUpperCase() === "CONFIRM";
}
