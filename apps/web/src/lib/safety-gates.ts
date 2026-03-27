/**
 * AKAI Safety Gates
 * Checks whether a user request is allowed based on plan scope and safety rules.
 */

export type UserPlan = 'trial' | 'starter' | 'growth' | 'scale';

export interface ScopeCheckResult {
  allowed: boolean;
  reason: string;
}

// ── Hard-coded ALWAYS_BLOCKED patterns ────────────────────────────────────────
// These are blocked regardless of plan or user identity.
const ALWAYS_BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Harm / violence
  {
    pattern: /\b(hurt|harm|kill|murder|attack|assault|threaten|stalk|harass)\b.*\b(person|people|someone|user|employee|customer|individual)\b/i,
    reason: 'Requests that may cause harm to people are not permitted.',
  },
  {
    pattern: /\b(bomb|weapon|explosiv|poison|drug manufactur|synthesize|meth|fentanyl)\b/i,
    reason: 'Requests related to weapons or illegal substances are not permitted.',
  },
  // Illegal activity
  {
    pattern: /\b(hack|breach|exploit|bypass|crack|phish|scrape.*without.*permission)\b/i,
    reason: 'Requests involving illegal or unauthorised computer access are not permitted.',
  },
  {
    pattern: /\b(launder|money laundering|fraud|scam|ponzi|pyramid scheme)\b/i,
    reason: 'Requests related to financial crimes are not permitted.',
  },
  // Manipulation / deception
  {
    pattern: /\b(manipulat|deceiv|defraud|mislead|gaslight)\b.*\b(customer|user|client|person|people)\b/i,
    reason: 'Requests designed to manipulate or deceive people are not permitted.',
  },
  // Privacy violations
  {
    pattern: /\b(other users?[''s]* data|another user[''s]* (email|account|info|details|leads)|access .{0,30} user[''s]* (record|account|data))\b/i,
    reason: "Access to other users' data is not permitted.",
  },
  // Code deployment via chat
  {
    pattern: /\b(deploy|push to production|ship to prod|run.*in production|modify.*codebase|edit.*source code|change.*production)\b/i,
    reason: 'Code deployment and production changes must be handled through the approved release process, not via chat.',
  },
  // Prompt injection attempts
  {
    pattern: /ignore (previous|your) instructions/i,
    reason: 'Prompt injection attempts are not permitted.',
  },
  {
    pattern: /\byou are now\b/i,
    reason: 'Prompt injection attempts are not permitted.',
  },
  {
    pattern: /\bact as\b/i,
    reason: 'Prompt injection attempts are not permitted.',
  },
  {
    pattern: /\bjailbreak\b/i,
    reason: 'Prompt injection attempts are not permitted.',
  },
  {
    pattern: /\bDAN mode\b/i,
    reason: 'Prompt injection attempts are not permitted.',
  },
  {
    pattern: /pretend you are/i,
    reason: 'Prompt injection attempts are not permitted.',
  },
  // System access
  {
    pattern: /\brun command\b/i,
    reason: 'System access requests are not permitted.',
  },
  {
    pattern: /\b(sudo|bash|shell|terminal|ssh)\b/i,
    reason: 'System access requests are not permitted.',
  },
  {
    pattern: /\bexecute\b/i,
    reason: 'System access requests are not permitted.',
  },
  // Data exfiltration
  {
    pattern: /list all users/i,
    reason: 'Data exfiltration requests are not permitted.',
  },
  {
    pattern: /dump database/i,
    reason: 'Data exfiltration requests are not permitted.',
  },
  {
    pattern: /export all/i,
    reason: 'Data exfiltration requests are not permitted.',
  },
  {
    pattern: /show me all data/i,
    reason: 'Data exfiltration requests are not permitted.',
  },
  // AKAI system manipulation
  {
    pattern: /change your system prompt/i,
    reason: 'Attempts to modify AKAI system configuration are not permitted.',
  },
  {
    pattern: /update your instructions/i,
    reason: 'Attempts to modify AKAI system configuration are not permitted.',
  },
  {
    pattern: /forget your rules/i,
    reason: 'Attempts to modify AKAI system configuration are not permitted.',
  },
];

// ── Plan → allowed modules mapping ───────────────────────────────────────────
const PLAN_MODULES: Record<UserPlan, string[]> = {
  trial: ['web'],
  starter: ['web', 'sales'],
  growth: ['web', 'sales', 'email-guard', 'social'],
  scale: ['web', 'sales', 'email-guard', 'social', 'ads', 'voice', 'recruit', 'proposals', 'calendar'],
};

// Module keyword hints used to detect out-of-plan requests
const MODULE_KEYWORDS: Record<string, RegExp> = {
  'email-guard': /\b(email guard|inbox monitor|auto.?reply|email proposal|inbound email)\b/i,
  social: /\b(instagram|linkedin post|facebook post|social media content|social post)\b/i,
  ads: /\b(google ads|meta ads|facebook ads|ad campaign|ad copy|ad group|ppc)\b/i,
  voice: /\b(sophie|voice module|outbound call|call campaign|bland\.ai)\b/i,
  recruit: /\b(recruit|screen candidate|job description|post a job|source candidate|applicant)\b/i,
  proposals: /\b(proposal module|generate.*proposal|sales proposal)\b/i,
  calendar: /\b(calendar|schedule a meeting|book a call|outlook calendar|google calendar)\b/i,
  sales: /\b(sales module|sales pipeline|upload.*leads|lead list|sophie.*call)\b/i,
  web: /\b(web module|site audit|website audit|audit my (site|website))\b/i,
};

/**
 * Checks whether a request is allowed for the given user and plan.
 *
 * @param userId     - The requesting user's ID (used for logging; reserved for future per-user checks)
 * @param requestText - The raw request text from the user
 * @param userPlan   - The user's current subscription plan
 * @returns { allowed, reason }
 */
export function checkRequestScope(
  userId: string,
  requestText: string,
  userPlan: UserPlan
): ScopeCheckResult {
  // 1. Check ALWAYS_BLOCKED patterns first
  for (const { pattern, reason } of ALWAYS_BLOCKED_PATTERNS) {
    if (pattern.test(requestText)) {
      console.warn(`[safety-gates] BLOCKED userId=${userId} plan=${userPlan} reason="${reason}"`);
      return { allowed: false, reason };
    }
  }

  // 2. Check plan scope — detect if the request targets a module not in the plan
  const allowedModules = PLAN_MODULES[userPlan] ?? PLAN_MODULES.trial;

  for (const [module, pattern] of Object.entries(MODULE_KEYWORDS)) {
    if (pattern.test(requestText) && !allowedModules.includes(module)) {
      const reason = `Your current plan (${userPlan}) does not include the ${module} module. Upgrade to access this feature.`;
      console.warn(`[safety-gates] OUT_OF_SCOPE userId=${userId} plan=${userPlan} module=${module}`);
      return { allowed: false, reason };
    }
  }

  return { allowed: true, reason: 'Request is within allowed scope.' };
}
