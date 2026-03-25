import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// AKAI Onboarding Chat — Self-contained state machine (no external backend)
// Handles the 6-step onboarding flow and returns structured responses.
// ---------------------------------------------------------------------------

type Step =
  | 'business_name'
  | 'industry'
  | 'goal'
  | 'location'
  | 'contact'
  | 'recommend';

interface OnboardingState {
  step: Step;
  data: Record<string, string>;
}

interface ChatRequest {
  message: string;
  state: OnboardingState;
}

const INDUSTRIES = [
  'Trades & Construction',
  'Real Estate',
  'Professional Services',
  'Hospitality & Food',
  'Health & Wellness',
  'Retail & E-commerce',
  'Recruitment Agency',
  'Other',
];

const GOALS = [
  'Get more leads & sales',
  'Hire better people faster',
  'Build or improve my website',
  'Run Google & Meta ads',
  'Grow on social media',
  'All of the above',
];

function recommendPlan(data: Record<string, string>): string {
  const goal = data.goal || '';
  if (goal === 'All of the above') return 'Scale';
  if (
    goal === 'Get more leads & sales' ||
    goal === 'Hire better people faster'
  )
    return 'Growth';
  return 'Starter';
}

function planPrice(plan: string): string {
  if (plan === 'Scale') return '$1,197/mo';
  if (plan === 'Growth') return '$597/mo';
  return '$297/mo';
}

function buildResponse(
  message: string,
  state: OnboardingState,
  buttons?: string[],
  action?: string,
  url?: string
) {
  return NextResponse.json({
    message,
    state,
    ...(buttons ? { buttons } : {}),
    ...(action ? { action, url } : {}),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, state } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    const trimmed = message.trim();
    const currentStep: Step = state?.step || 'business_name';
    const data: Record<string, string> = state?.data || {};

    // ── Step transitions ────────────────────────────────────────────────────

    if (currentStep === 'business_name') {
      if (trimmed.length < 2) {
        return buildResponse(
          "Let's get your name right — what's your business called?",
          { step: 'business_name', data }
        );
      }
      data.business_name = trimmed;
      return buildResponse(
        `Love it — ${trimmed} sounds like a winner. 💪\n\nWhat industry are you in?`,
        { step: 'industry', data },
        INDUSTRIES
      );
    }

    if (currentStep === 'industry') {
      data.industry = trimmed;
      return buildResponse(
        `Got it. What's your #1 priority right now for ${data.business_name}?`,
        { step: 'goal', data },
        GOALS
      );
    }

    if (currentStep === 'goal') {
      data.goal = trimmed;
      return buildResponse(
        `Perfect. Where are you based? (City or region — helps us target the right leads for you.)`,
        { step: 'location', data }
      );
    }

    if (currentStep === 'location') {
      data.location = trimmed;
      return buildResponse(
        `Almost there. What's the best email to send your setup confirmation to?`,
        { step: 'contact', data }
      );
    }

    if (currentStep === 'contact') {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        return buildResponse(
          "That doesn't look like a valid email — try again so I can send your setup details.",
          { step: 'contact', data }
        );
      }
      data.email = trimmed;

      const plan = recommendPlan(data);
      const price = planPrice(plan);

      return buildResponse(
        `Based on what you've told me, I'd put ${data.business_name} on the **${plan} plan** at ${price}.\n\nThat gets you everything you need to ${data.goal.toLowerCase()} in ${data.location}.\n\nI'll send your setup details to ${data.email}. Ready to start your free 7-day trial?`,
        { step: 'recommend', data: { ...data, plan } },
        ['Start My Free Trial →', 'Tell Me More']
      );
    }

    if (currentStep === 'recommend') {
      if (trimmed.includes('Trial') || trimmed.includes('Start')) {
        return buildResponse(
          `You're in! 🚀 Setting up ${data.business_name} now…`,
          { step: 'recommend', data },
          undefined,
          'redirect',
          `mailto:hello@getakai.ai?subject=Start Free Trial — ${encodeURIComponent(data.business_name)}&body=Name: ${encodeURIComponent(data.business_name)}%0AIndustry: ${encodeURIComponent(data.industry)}%0AGoal: ${encodeURIComponent(data.goal)}%0ALocation: ${encodeURIComponent(data.location)}%0AEmail: ${encodeURIComponent(data.email)}%0APlan: ${encodeURIComponent(data.plan)}`
        );
      }
      const plan = data.plan || 'Growth';
      const price = planPrice(plan);
      return buildResponse(
        `The ${plan} plan at ${price}/mo gives you:\n\n• Everything needed to ${data.goal.toLowerCase()}\n• 7-day free trial, cancel anytime\n• No lock-in contracts\n• Onboarding call included\n\nReady to go?`,
        { step: 'recommend', data },
        ['Start My Free Trial →']
      );
    }

    // Fallback
    return buildResponse(
      "Let's start fresh — what's the name of your business?",
      { step: 'business_name', data: {} }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    // Never leak stack traces or internal details to the client
    console.error('[/api/chat]', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
