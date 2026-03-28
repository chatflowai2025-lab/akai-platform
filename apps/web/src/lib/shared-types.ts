// ============================================================
// AKAI Platform — Shared Types
// ============================================================

export type ModuleType = 'sales' | 'recruit' | 'web' | 'ads' | 'social';
export type PlanTier = 'free' | 'starter' | 'grow' | 'scale' | 'enterprise';

// ── Users & Auth ─────────────────────────────────────────────

export interface AKAIUser {
  uid: string;
  email: string;
  name: string;
  teamId: string;
  createdAt: string;
}

// ── Teams / Workspaces ───────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  businessName: string;
  businessType: string;
  industry: string;
  location: string;
  plan: PlanTier;
  modules: ModuleType[];
  ownerId: string;
  members: TeamMember[];
  createdAt: string;
}

export interface TeamMember {
  uid: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
}

// ── Leads (AKAI Sales) ───────────────────────────────────────

export interface Lead {
  id: string;
  teamId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: 'new' | 'calling' | 'called' | 'booked' | 'not_interested' | 'voicemail';
  callId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CallRecord {
  id: string;
  teamId: string;
  leadId: string;
  blandCallId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  duration?: number;
  recording?: string;
  transcript?: string;
  outcome?: 'booked' | 'not_interested' | 'voicemail' | 'no_answer' | 'callback';
  bookedAt?: string;
  createdAt: string;
}

// ── Modules ──────────────────────────────────────────────────

export interface Module {
  type: ModuleType;
  name: string;
  description: string;
  price: number;
  active: boolean;
  config: Record<string, unknown>;
}

export const MODULE_CATALOG: Record<ModuleType, Omit<Module, 'active' | 'config'>> = {
  sales: {
    type: 'sales',
    name: 'AKAI Sales',
    description: 'AI finds leads, calls them via Sophie, and books meetings automatically.',
    price: 297,
  },
  recruit: {
    type: 'recruit',
    name: 'AKAI Recruit',
    description: 'AI sources candidates, screens them, and books interviews.',
    price: 247,
  },
  web: {
    type: 'web',
    name: 'AKAI Web',
    description: 'AI builds and manages your website via chat — no dev needed.',
    price: 197,
  },
  ads: {
    type: 'ads',
    name: 'AKAI Ads',
    description: 'Google + Meta ad campaigns created and optimised by AI.',
    price: 397,
  },
  social: {
    type: 'social',
    name: 'AKAI Social',
    description: 'Instagram + LinkedIn content automation on autopilot.',
    price: 147,
  },
};

// ── Chat / NLU ───────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  action?: string;
  buttons?: ChatButton[];
}

export interface ChatButton {
  label: string;
  action?: string;
  url?: string;
  primary?: boolean;
}

export interface ChatSession {
  id: string;
  teamId: string;
  userId: string;
  messages: ChatMessage[];
  context: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Onboarding ───────────────────────────────────────────────

export interface OnboardingState {
  step: 'welcome' | 'business_name' | 'industry' | 'goal' | 'modules' | 'complete';
  teamId?: string;
  data: Partial<{
    businessName: string;
    businessType: string;
    industry: string;
    location: string;
    pitch: string;
    goals: string[];
    modules: ModuleType[];
  }>;
}

// ── Billing ──────────────────────────────────────────────────

export interface BillingPlan {
  tier: PlanTier;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'annual';
  modulesIncluded: number;
  features: string[];
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    tier: 'free',
    name: 'Free Trial',
    price: 0,
    billingCycle: 'monthly',
    modulesIncluded: 1,
    features: ['1 module free for 14 days', 'Up to 10 leads', 'Basic dashboard'],
  },
  {
    tier: 'starter',
    name: 'Starter',
    price: 297,
    billingCycle: 'monthly',
    modulesIncluded: 1,
    features: ['1 module', 'Unlimited leads', 'Priority support', 'Analytics'],
  },
  {
    tier: 'grow',
    name: 'Grow',
    price: 597,
    billingCycle: 'monthly',
    modulesIncluded: 3,
    features: ['3 modules', 'Unlimited leads', 'Team seats (5)', 'Advanced analytics', 'Priority support'],
  },
  {
    tier: 'scale',
    name: 'Scale',
    price: 997,
    billingCycle: 'monthly',
    modulesIncluded: 5,
    features: ['All 5 modules', 'Unlimited everything', 'Unlimited team seats', 'White-label option', 'Dedicated success manager'],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 0, // custom
    billingCycle: 'monthly',
    modulesIncluded: 5,
    features: ['Custom pricing', 'SLA guarantee', 'Custom integrations', 'On-prem option', 'Dedicated team'],
  },
];

// ── Consent / Compliance ─────────────────────────────────────

export interface ConsentRecord {
  userId: string;
  email: string;
  phone: string;
  consentType: 'signup' | 'invite_accept' | 'module_activate';
  consentText: string;
  jurisdiction: 'AU' | 'US' | 'UK' | 'other';
  timestamp: string;
  ipAddress: string;
}

// ── API Responses ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
