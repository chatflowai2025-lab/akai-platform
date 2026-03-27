/**
 * AKAI Discord Trailblazers Gate
 *
 * Controls what Trailblazer-tier community members can request via Discord,
 * and defines the canonical Trailblazer member list.
 */

// ── Trailblazer member list ───────────────────────────────────────────────────
// Aaron (mrakersten@gmail.com) is a permanent Trailblazer and receives
// everything other Trailblazers receive.
export const TRAILBLAZER_MEMBERS: string[] = [
  'mrakersten@gmail.com', // Aaron Kersten — founder, always included
];

/**
 * Returns true if the given email is a registered Trailblazer.
 */
export function isTrailblazerMember(email: string): boolean {
  return TRAILBLAZER_MEMBERS.map(e => e.toLowerCase()).includes(email.toLowerCase());
}

// ── Allowed actions ───────────────────────────────────────────────────────────
export const TRAILBLAZER_ALLOWED_ACTIONS: string[] = [
  'Log a feature request',
  'Report a bug',
  'Give product feedback',
  'Ask about platform capabilities',
  'Ask about pricing',
];

// ── Blocked actions ───────────────────────────────────────────────────────────
export const TRAILBLAZER_BLOCKED_ACTIONS: string[] = [
  'Deploy or change code',
  'Modify platform settings',
  'Access other users\' data',
  'Request features outside subscribed plan',
  'Any harmful or illegal requests',
];

// ── Classifier patterns ───────────────────────────────────────────────────────

interface ActionPattern {
  category: string;
  allowed: boolean;
  patterns: RegExp[];
}

const ACTION_PATTERNS: ActionPattern[] = [
  // ── ALLOWED ────────────────────────────────────────────────────────────────
  {
    category: 'Feature request',
    allowed: true,
    patterns: [
      /\b(feature request|feature idea|would love|wish (akai|it) (could|would)|can you add|please add|suggestion)\b/i,
      /\b(it would be (great|nice|helpful)|i'd love to see)\b/i,
    ],
  },
  {
    category: 'Bug report',
    allowed: true,
    patterns: [
      /\b(bug|error|broken|not working|crash|fails?|doesn'?t work|issue with|problem with)\b/i,
      /\b(page (is )?blank|can'?t (connect|load|save|login|sign in)|something'?s wrong)\b/i,
    ],
  },
  {
    category: 'Product feedback',
    allowed: true,
    patterns: [
      /\b(feedback|thoughts on|my experience|what i think|honest(ly)?|impressed|disappointed|love the|hate the)\b/i,
    ],
  },
  {
    category: 'Platform capabilities',
    allowed: true,
    patterns: [
      /\b(what can (akai|you) do|does akai|can akai|how does (akai|sophie|email guard|the (web|ads|social|recruit|proposal|calendar|voice|sales) module) work|what modules|capabilities)\b/i,
    ],
  },
  {
    category: 'Pricing',
    allowed: true,
    patterns: [
      /\b(price|pricing|how much|cost|plan|starter|growth|scale|subscription|per month|upgrade)\b/i,
    ],
  },

  // ── BLOCKED ────────────────────────────────────────────────────────────────
  {
    category: 'Code deployment',
    allowed: false,
    patterns: [
      /\b(deploy|push to prod|ship|release|rollback|git push|run in production|modify.*code|change.*codebase)\b/i,
    ],
  },
  {
    category: 'Platform settings modification',
    allowed: false,
    patterns: [
      /\b(change.*settings|modify.*config|update.*production|reset.*platform|disable.*feature|enable.*feature)\b/i,
    ],
  },
  {
    category: 'Other users\' data access',
    allowed: false,
    patterns: [
      /\b(other user[''s]* (data|account|email|record|lead)|another user|user[''s]* (private|personal) (info|data|record))\b/i,
    ],
  },
  {
    category: 'Out-of-plan request',
    allowed: false,
    patterns: [
      /\b(give me (access to|the) .{0,40} (module|feature) (for free|without upgrading|without paying))\b/i,
      /\b(bypass.*plan|skip.*upgrade|unlock.*without)\b/i,
    ],
  },
  {
    category: 'Harmful or illegal request',
    allowed: false,
    patterns: [
      /\b(harm|hurt|kill|threaten|stalk|harass|fraud|scam|launder|hack|phish|exploit|bomb|weapon)\b/i,
    ],
  },
];

// ── Public classifier ─────────────────────────────────────────────────────────

export interface TrailblazerCheckResult {
  allowed: boolean;
  category: string;
}

/**
 * Classifies a Discord message from a Trailblazer member.
 *
 * Returns:
 *  - `allowed: true`  + the matched allowed category, or
 *  - `allowed: false` + the matched blocked category, or
 *  - `allowed: true`  + 'General message' if no pattern matches (default allow).
 */
export function isTrailblazerRequest(message: string): TrailblazerCheckResult {
  // Check blocked patterns first (safety over permissiveness)
  for (const action of ACTION_PATTERNS.filter(a => !a.allowed)) {
    for (const pattern of action.patterns) {
      if (pattern.test(message)) {
        return { allowed: false, category: action.category };
      }
    }
  }

  // Check allowed patterns
  for (const action of ACTION_PATTERNS.filter(a => a.allowed)) {
    for (const pattern of action.patterns) {
      if (pattern.test(message)) {
        return { allowed: true, category: action.category };
      }
    }
  }

  // Default: allow general messages that don't match any blocked pattern
  return { allowed: true, category: 'General message' };
}
