export type PlanCode = "free" | "basic" | "advanced";

export type FieldPolicy = {
  fieldKey: string;
  freeAccess: boolean;
  basicAccess: boolean;
  advancedAccess: boolean;
  requiresOwnerConsent: boolean;
  isSensitive: boolean;
};

export type ProjectionContext = {
  plan: PlanCode;
  ownerConsent: Record<string, boolean | undefined>;
  ownerPrivacy: Record<string, boolean | undefined>;
  verificationState?: "unverified" | "pending" | "verified" | "expired";
  relationshipState?: "none" | "requested" | "matched" | "blocked";
  safetyPolicyAllowed?: boolean;
  blockedFields?: string[];
};

export function canViewField(policy: FieldPolicy, context: ProjectionContext) {
  if (context.blockedFields?.includes(policy.fieldKey)) return false;
  if (context.safetyPolicyAllowed === false) return false;
  if (context.verificationState && context.verificationState !== "verified" && policy.isSensitive) return false;
  if (context.relationshipState === "blocked") return false;
  if (policy.fieldKey === "privatePhoto" && context.relationshipState !== "matched") return false;
  if (context.ownerPrivacy[policy.fieldKey] === false) return false;
  if (policy.requiresOwnerConsent && context.ownerConsent[policy.fieldKey] !== true) return false;
  if (policy.isSensitive && context.ownerConsent[policy.fieldKey] !== true) return false;

  if (context.plan === "free") return policy.freeAccess;
  if (context.plan === "basic") return policy.basicAccess;
  return policy.advancedAccess;
}

export function projectProfile<T extends Record<string, unknown>>(
  profile: T,
  policies: FieldPolicy[],
  context: ProjectionContext,
): Partial<T> {
  const allowed = new Set(
    policies.filter(policy => canViewField(policy, context)).map(policy => policy.fieldKey),
  );

  return Object.fromEntries(
    Object.entries(profile).filter(([key]) => allowed.has(key)),
  ) as Partial<T>;
}
