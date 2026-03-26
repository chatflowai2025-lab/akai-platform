import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// AKAI Onboarding API — Stateful wizard for new users
// Drives the onboarding conversation in /onboard
// ---------------------------------------------------------------------------

interface OnboardData {
  industry?: string;
  businessName?: string;
  goal?: string;
  location?: string;
  contact?: string; // email or phone
}

type OnboardStep = 'industry' | 'business_name' | 'goal' | 'location' | 'contact' | 'complete';

interface OnboardState {
  step: OnboardStep;
  data: OnboardData;
}

interface OnboardRequest {
  message: string;
  state: OnboardState;
}

function buildResponse(
  message: string,
  newState: OnboardState,
  options?: { action?: string; url?: string; buttons?: { label: string; primary?: boolean }[] }
) {
  return NextResponse.json({
    message,
    state: newState,
    ...options,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body: OnboardRequest = await req.json();
    const { message, state } = body;

    if (!message || !state) {
      return NextResponse.json({ error: 'message and state are required' }, { status: 400 });
    }

    const trimmed = message.trim();

    switch (state.step) {
      case 'industry': {
        // User just answered "what industry are you in?"
        const newState: OnboardState = {
          step: 'business_name',
          data: { ...state.data, industry: trimmed },
        };
        return buildResponse(
          `${trimmed} — great space to be in. What's the name of your business?`,
          newState
        );
      }

      case 'business_name': {
        const newState: OnboardState = {
          step: 'goal',
          data: { ...state.data, businessName: trimmed },
        };
        return buildResponse(
          `Love it — ${trimmed}. What's your main goal right now? (e.g. more leads, faster follow-up, book more meetings)`,
          newState
        );
      }

      case 'goal': {
        const newState: OnboardState = {
          step: 'location',
          data: { ...state.data, goal: trimmed },
        };
        return buildResponse(
          `Got it. Where are you based? (City or region — helps us tune local market targeting)`,
          newState
        );
      }

      case 'location': {
        const newState: OnboardState = {
          step: 'contact',
          data: { ...state.data, location: trimmed },
        };
        return buildResponse(
          `Perfect. Last one — what's the best email or phone number to reach you on? (We'll send your setup confirmation here)`,
          newState
        );
      }

      case 'contact': {
        const newState: OnboardState = {
          step: 'complete',
          data: { ...state.data, contact: trimmed },
        };
        const businessName = newState.data.businessName || 'your business';
        return buildResponse(
          `You're all set! 🎉\n\nHere's what I've configured for **${businessName}**:\n\n✅ Sales module — activated\n✅ AI lead qualification — on\n✅ Auto follow-up — ready\n\nYour dashboard is ready. Let's go close some deals.`,
          newState,
          {
            action: 'complete',
            buttons: [{ label: 'Start My Free Trial →', primary: true }],
          }
        );
      }

      default: {
        return buildResponse(
          "I think you're already set up! Head to your dashboard to get started.",
          state,
          { action: 'redirect', url: '/dashboard' }
        );
      }
    }
  } catch (err) {
    console.error('[/api/onboard]', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
