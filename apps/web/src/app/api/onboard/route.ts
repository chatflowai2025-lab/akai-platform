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
  notifEmail?: boolean;
  notifSms?: boolean;
  notifSmsNumber?: string;
  notifWhatsapp?: boolean;
  notifWhatsappNumber?: string;
}

type OnboardStep = 'industry' | 'business_name' | 'goal' | 'location' | 'contact' | 'notifications' | 'complete';

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
          `Perfect. What's the best email or phone number to reach you on? (We'll send your setup confirmation here)`,
          newState
        );
      }

      case 'contact': {
        const newState: OnboardState = {
          step: 'notifications',
          data: { ...state.data, contact: trimmed },
        };
        return buildResponse(
          `Almost done! Last thing — how would you like AKAI to notify you when a lead qualifies?\n\nReply with one or more:\n📧 **email** — we'll notify you by email\n💬 **sms** — text message to your mobile\n📱 **whatsapp** — WhatsApp message\n\nOr just say **email** to keep it simple.`,
          newState
        );
      }

      case 'notifications': {
        const lower = trimmed.toLowerCase();
        const wantsEmail = lower.includes('email') || lower.includes('e-mail');
        const wantsSms = lower.includes('sms') || lower.includes('text') || lower.includes('sms');
        const wantsWhatsapp = lower.includes('whatsapp') || lower.includes('whats app') || lower.includes('wa');

        // If none detected, default to email
        const hasChoice = wantsEmail || wantsSms || wantsWhatsapp;

        const newState: OnboardState = {
          step: 'complete',
          data: {
            ...state.data,
            notifEmail: !hasChoice || wantsEmail,
            notifSms: wantsSms,
            notifWhatsapp: wantsWhatsapp,
          },
        };

        const channels = [];
        if (!hasChoice || wantsEmail) channels.push('email');
        if (wantsSms) channels.push('SMS');
        if (wantsWhatsapp) channels.push('WhatsApp');

        const businessName = newState.data.businessName || 'your business';
        return buildResponse(
          `You're all set! 🎉\n\nHere's what I've configured for **${businessName}**:\n\n✅ Sales module — activated\n✅ AI lead qualification — on\n✅ Auto follow-up — ready\n✅ Notifications — ${channels.join(', ')}\n\nYour dashboard is ready. Let's go close some deals.`,
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
