'use client';


import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import type { ChatMessage } from '@/lib/shared-types';
import ChatBubble from '@/components/ui/ChatBubble';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';

// ---------------------------------------------------------------------------
// Onboarding types (local — more specific than shared OnboardingState)
// ---------------------------------------------------------------------------

type OnboardStep = 'industry' | 'business_name' | 'website' | 'goal' | 'location' | 'contact' | 'notifications' | 'connect_email' | 'connect_calendar' | 'terms' | 'calendar' | 'complete';

// Step order for progress bar (excluding 'complete')
const STEP_ORDER: OnboardStep[] = ['industry', 'business_name', 'website', 'goal', 'location', 'contact', 'notifications', 'terms'];
const STEP_LABELS = ['Industry', 'Business', 'Website', 'Goal', 'Location', 'Contact', 'Notify', 'Terms'];

function ProgressBar({ currentStep }: { currentStep: OnboardStep }) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const effectiveIndex = currentIndex === -1 ? STEP_ORDER.length : currentIndex;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4">
      <div className="flex items-center">
        {STEP_ORDER.map((step, i) => {
          const isComplete = i < effectiveIndex;
          const isCurrent = i === effectiveIndex;
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isComplete
                    ? 'bg-[#D4AF37] text-black'
                    : isCurrent
                      ? 'bg-[#D4AF37]/20 border-2 border-[#D4AF37] text-[#D4AF37]'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-600'
                }`}>
                  {isComplete ? '✓' : i + 1}
                </div>
                <span className={`text-[9px] mt-1 font-medium hidden sm:block ${
                  isCurrent ? 'text-[#D4AF37]' : isComplete ? 'text-gray-400' : 'text-gray-600'
                }`}>{STEP_LABELS[i]}</span>
              </div>
              {i < STEP_ORDER.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-all ${i < effectiveIndex ? 'bg-[#D4AF37]' : 'bg-[#2a2a2a]'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// CompletionScreen removed — handleComplete now redirects straight to /dashboard

interface OnboardData {
  industry?: string;
  businessName?: string;
  website?: string;
  goal?: string;
  location?: string;
  contact?: string;
  notifEmail?: boolean;
  notifSms?: boolean;
  notifSmsNumber?: string;
  notifWhatsapp?: boolean;
  notifWhatsappNumber?: string;
  emailProvider?: 'google' | 'microsoft' | null;
  emailConnected?: 'google' | 'microsoft' | null;
  calendarProvider?: 'google' | 'outlook' | null;
  calendarConnected?: 'google' | 'outlook' | null;
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
}

interface OnboardState {
  step: OnboardStep;
  data: OnboardData;
}

// Hints shown below the input for each onboarding step
const STEP_HINTS: Partial<Record<OnboardStep, string>> = {
  industry: "We use this to personalise your lead scripts and Sophie's call style",
  business_name: "This is how Sophie will introduce herself on calls",
  goal: "This helps AK focus on what matters most to grow your business",
  location: "We target leads in your area first",
  contact: "We'll send you lead alerts and important updates here",
  notifications: "Choose how you want to hear from AKAI — we'll never spam you",
  website: 'We\'ll audit your site and include results in your setup report',
  connect_email: 'So AK can send and receive on your behalf — from YOUR address',
  connect_calendar: "So clients can book meetings with your real availability — 24/7",
  terms: 'Review and accept our Terms of Service to activate your free trial',
  calendar: "Connect once and Sophie will book meetings automatically",
};

function getInitialMessage(): ChatMessage {
  try {
    const signupRaw = typeof window !== 'undefined' ? sessionStorage.getItem('akai_signup_details') : null;
    if (signupRaw) {
      const signup = JSON.parse(signupRaw) as { name?: string; businessName?: string; industry?: string; location?: string };
      const name = signup.name ? `, ${signup.name}` : '';
      if (signup.industry && signup.businessName && signup.location) {
        return { id: '1', role: 'assistant', timestamp: new Date().toISOString(),
          content: `Hi${name}! I'm AK — your AI business partner. I can see you're in ${signup.industry}, running ${signup.businessName} in ${signup.location}. Looking good.\n\nWhat's your main goal right now? (e.g. more leads, faster follow-up, book more meetings)` };
      }
      if (signup.industry && signup.businessName) {
        return { id: '1', role: 'assistant', timestamp: new Date().toISOString(),
          content: `Hi${name}! I'm AK — your AI business partner. You're in ${signup.industry}, running ${signup.businessName}.\n\nDo you have a website? (Drop the URL or type "no")` };
      }
      if (signup.industry) {
        return { id: '1', role: 'assistant', timestamp: new Date().toISOString(),
          content: `Hi${name}! I'm AK — your AI business partner. I see you're in ${signup.industry}.

What's your business name?` };
      }
    }
  } catch { /* ignore */ }
  return { id: '1', role: 'assistant', timestamp: new Date().toISOString(),
    content: "Hi, I'm AK — your AI business partner. I'm here to build, run, and grow your business while you focus on closing deals.\n\nLet's get you set up in 2 minutes.\n\nFirst — what industry are you in?" };
}

const INITIAL_MESSAGE: ChatMessage = getInitialMessage();

const _INITIAL_MESSAGE_UNUSED: ChatMessage = {
  id: '1',
  role: 'assistant',
  content: "Hi, I'm AK — your AI business partner. I'm here to build, run, and grow your business while you focus on closing deals.\n\nLet's get you set up in 2 minutes.\n\nFirst — what industry are you in?",
  timestamp: new Date().toISOString(),
};

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app';
const RAILWAY_API_KEY = process.env.NEXT_PUBLIC_RAILWAY_API_KEY || 'aiclozr_api_key_2026_prod';

const OAUTH_REDIRECT_URI = 'https://api-server-production-2a27.up.railway.app/api/oauth-capture';
const GMAIL_CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID || '483958880068-fl9q2ildmfjmhfcat93pkqpcrl79qhb4.apps.googleusercontent.com';
const MS_CLIENT_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '963f871d-b42e-4cef-a021-cc8b4f295efe';
const MS_TENANT = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID || 'common';

export default function OnboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [state, setState] = useState<OnboardState>(() => {
    // Pre-populate from signup page data if available
    try {
      const signupRaw = typeof window !== 'undefined' ? sessionStorage.getItem('akai_signup_details') : null;
      if (signupRaw) {
        const signup = JSON.parse(signupRaw) as { name?: string; businessName?: string; industry?: string; location?: string };
        const data: OnboardData = {};
        if (signup.industry) data.industry = signup.industry;
        if (signup.businessName) data.businessName = signup.businessName;
        if (signup.location) data.location = signup.location;
        // Determine furthest step already completed
        let step: OnboardStep = 'industry';
        if (signup.industry) step = 'business_name';
        if (signup.industry && signup.businessName) step = 'website';
        if (signup.industry && signup.businessName && signup.location) step = 'goal';
        return { step, data };
      }
    } catch { /* ignore */ }
    return { step: 'industry', data: {} };
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Restore onboarding state after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get('step');
    const connectedParam = params.get('connected');
    if (stepParam && connectedParam) {
      // Try URL-encoded state first, then localStorage fallback
      const urlState = params.get('onboardState');
      const savedRaw = urlState ? decodeURIComponent(urlState) : localStorage.getItem('akai_onboard_state');
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw) as OnboardState;
          localStorage.removeItem('akai_onboard_state');
          let newState: OnboardState;
          if (connectedParam === 'gmail') {
            newState = { ...parsed, step: 'connect_calendar', data: { ...parsed.data, emailProvider: 'google', emailConnected: 'google' } };
          } else if (connectedParam === 'microsoft_email') {
            newState = { ...parsed, step: 'connect_calendar', data: { ...parsed.data, emailProvider: 'microsoft', emailConnected: 'microsoft' } };
          } else if (connectedParam === 'google_calendar') {
            newState = { ...parsed, step: 'terms', data: { ...parsed.data, calendarProvider: 'google', calendarConnected: 'google' } };
          } else if (connectedParam === 'microsoft_calendar') {
            newState = { ...parsed, step: 'terms', data: { ...parsed.data, calendarProvider: 'outlook', calendarConnected: 'outlook' } };
          } else {
            newState = { ...parsed, step: stepParam as OnboardStep };
          }
          setState(newState);
          // Clean the URL without triggering a navigation
          window.history.replaceState({}, '', '/onboard');
        } catch (e) {
          console.error('[ONBOARD] Failed to restore session state:', e);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- OAuth handlers ---
  const buildGoogleOAuthUrl = (scopes: string, returnTo: string) => {
    const params = new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      redirect_uri: OAUTH_REDIRECT_URI,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state: returnTo,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const buildMicrosoftOAuthUrl = (scopes: string, returnTo: string) => {
    const params = new URLSearchParams({
      client_id: MS_CLIENT_ID,
      redirect_uri: OAUTH_REDIRECT_URI,
      response_type: 'code',
      scope: scopes,
      state: returnTo,
    });
    return `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize?${params.toString()}`;
  };

  const saveStateAndRedirect = (url: string) => {
    // Encode full onboarding state into the return URL so it survives cross-origin OAuth redirects
    // sessionStorage is lost on cross-origin navigation — URL state param is reliable
    const stateEncoded = encodeURIComponent(JSON.stringify(state));
    const urlWithState = url.includes('?')
      ? url + '&onboardState=' + stateEncoded
      : url + '?onboardState=' + stateEncoded;
    // Also save to localStorage as backup (same origin, persists across navigations)
    try { localStorage.setItem('akai_onboard_state', JSON.stringify(state)); } catch { /* ignore */ }
    window.location.href = urlWithState;
  };

  const handleGoogleEmail = () => {
    const returnTo = `${window.location.origin}/onboard?step=connect_calendar&connected=gmail`;
    saveStateAndRedirect(buildGoogleOAuthUrl(
      'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send',
      returnTo
    ));
  };

  const handleMicrosoftEmail = () => {
    const returnTo = `${window.location.origin}/onboard?step=connect_calendar&connected=microsoft_email`;
    saveStateAndRedirect(buildMicrosoftOAuthUrl(
      'offline_access Mail.ReadWrite Mail.Send',
      returnTo
    ));
  };

  const handleGoogleCalendar = () => {
    const returnTo = `${window.location.origin}/onboard?step=terms&connected=google_calendar`;
    saveStateAndRedirect(buildGoogleOAuthUrl(
      'https://www.googleapis.com/auth/calendar',
      returnTo
    ));
  };

  const handleMicrosoftCalendar = () => {
    const returnTo = `${window.location.origin}/onboard?step=terms&connected=microsoft_calendar`;
    saveStateAndRedirect(buildMicrosoftOAuthUrl(
      'offline_access Calendars.ReadWrite',
      returnTo
    ));
  };

  // Auth gate
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleComplete = async (finalState: OnboardState) => {
    if (!user?.uid || completing) return;
    setCompleting(true);

    // Pull from state — fall back to signup details if chat skipped those steps
    let signupDetails: Record<string,string> = {};
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('akai_signup_details') : null;
      if (raw) signupDetails = JSON.parse(raw);
    } catch { /* ignore */ }
    const businessName = finalState.data.businessName || signupDetails.businessName || '';
    const industry = finalState.data.industry || signupDetails.industry || '';
    const goal = finalState.data.goal || '';
    const location = finalState.data.location || signupDetails.location || '';
    const contact = finalState.data.contact || '';

    try {
      // Non-fatal: save to Firestore
      try {
        const db = getFirebaseDb();
        if (db) {
          const { notifEmail, notifSms, notifSmsNumber, notifWhatsapp, notifWhatsappNumber, calendarProvider, emailProvider, emailConnected, calendarConnected } = finalState.data;
          await setDoc(
            doc(db, 'users', user.uid),
            {
              onboarding: {
                businessName: businessName || '',
                website: finalState.data.website || '',
                industry: industry || '',
                goal: goal || '',
                location: location || '',
                contact: contact || '',
                completedAt: new Date().toISOString(),
                calendarProvider: calendarProvider || null,
                emailProvider: emailProvider || null,
              },
              campaignConfig: {
                businessName: businessName || '',
                website: finalState.data.website || '',
                industry: industry || '',
                location: location || '',
                targetCustomer: '',
                goal: goal || '',
              },
              notificationPrefs: {
                email: notifEmail !== false,
                sms: notifSms || false,
                smsNumber: notifSmsNumber || '',
                whatsapp: notifWhatsapp || false,
                whatsappNumber: notifWhatsappNumber || '',
              },
              calendarConfig: { provider: calendarProvider || null, connected: !!calendarConnected },
              ...(emailConnected === 'google' ? { 'gmail.connected': true } : {}),
              ...(emailConnected === 'microsoft' ? { inboxConnection: { connected: true, provider: 'microsoft' } } : {}),
              ...(calendarConnected === 'google' ? { googleCalendarConnected: true } : {}),
              termsAccepted: true,
              termsAcceptedAt: finalState.data.termsAcceptedAt || new Date().toISOString(),
              onboardingComplete: true,
              businessName: businessName || '',
              displayName: businessName || '',
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.error('[ONBOARD] Firestore save failed (non-fatal):', err);
      }

      // Non-fatal: notify Railway (10s timeout, retry once)
      const railwayPayload = JSON.stringify({
        userId: user.uid, email: user.email || contact || '',
        name: user.displayName || businessName || '',
        businessName: businessName || '', industry: industry || '',
        location: location || '', contact: contact || '',
        uid: user.uid, selectedPlan: 'trial',
      });
      const tryRailway = async () => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10000);
        try {
          await fetch(`${RAILWAY_API}/api/onboarding/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
            body: railwayPayload,
            signal: ctrl.signal,
          });
        } finally {
          clearTimeout(t);
        }
      };
      try {
        await tryRailway();
      } catch {
        try { await tryRailway(); } catch (err) {
          console.error('[ONBOARD] Railway call failed (non-fatal):', err);
        }
      }
    } finally {
      // ALWAYS redirect — completing resets, user never gets stuck
      setCompleting(false);
      router.replace('/dashboard');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || chatLoading || completing) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, state }),
      });
      const data = await res.json();

      if (data.message) {
        const newMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          buttons: data.buttons,
          action: data.action,
        };
        setMessages(prev => [...prev, newMsg]);
      }

      if (data.state) {
        // Override 'calendar' AI step → native connect_email UI
        const resolvedState: OnboardState = data.state.step === 'calendar'
          ? { ...data.state, step: 'connect_email' }
          : data.state;
        setState(resolvedState);

        // When step is 'complete', trigger account setup
        if (resolvedState.step === 'complete' && data.action === 'complete') {
          await handleComplete(resolvedState);
        }
      }
    } catch (err) {
      console.error('[ONBOARD]', err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, something went wrong. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Show nothing while auth resolves
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div role="status" aria-label="Loading" className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // On completion, always redirect to dashboard (never show an intermediate screen)
  if (state.step === 'complete' && !completing) {
    router.replace('/dashboard');
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div role="status" aria-label="Loading" className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // connect_email step — native UI (not AI chat)
  if (state.step === 'connect_email') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <header className="flex items-center gap-3 px-6 py-4 border-b border-[#1f1f1f]">
          <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs">AK</div>
          <span className="font-semibold text-white">AKAI</span>
        </header>
        <ProgressBar currentStep="connect_email" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📧</span>
                </div>
                <h2 className="text-xl font-black text-white mb-2">Connect your email</h2>
                <p className="text-gray-400 text-sm">So AK can send and receive on your behalf — from YOUR address</p>
              </div>
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleGoogleEmail}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-white text-black hover:bg-gray-100 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#FFC107"/>
                    <path d="M3.15295 7.3455L6.43845 9.755C7.32745 7.554 9.48045 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C8.15895 2 4.82795 4.1685 3.15295 7.3455Z" fill="#FF3D00"/>
                    <path d="M12 22C14.583 22 16.93 21.0115 18.7045 19.404L15.6095 16.785C14.5718 17.5742 13.3038 18.001 12 18C9.39903 18 7.19053 16.3415 6.35853 14.027L3.09753 16.5395C4.75253 19.778 8.11353 22 12 22Z" fill="#4CAF50"/>
                    <path d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L15.6095 16.7845L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#1976D2"/>
                  </svg>
                  Connect Google Gmail
                </button>
                <button
                  onClick={handleMicrosoftEmail}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#2a2a2a] text-white hover:bg-[#333] border border-[#3a3a3a] transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.4 2H2V11.4H11.4V2Z" fill="#F25022"/>
                    <path d="M22 2H12.6V11.4H22V2Z" fill="#7FBA00"/>
                    <path d="M11.4 12.6H2V22H11.4V12.6Z" fill="#00A4EF"/>
                    <path d="M22 12.6H12.6V22H22V12.6Z" fill="#FFB900"/>
                  </svg>
                  Connect Microsoft Outlook
                </button>
              </div>
              <div className="text-center">
                <button
                  onClick={() => setState(s => ({ ...s, step: 'connect_calendar' }))}
                  className="text-sm text-gray-500 hover:text-gray-300 transition"
                >
                  Skip for now →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // connect_calendar step — native UI (not AI chat)
  if (state.step === 'connect_calendar') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <header className="flex items-center gap-3 px-6 py-4 border-b border-[#1f1f1f]">
          <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs">AK</div>
          <span className="font-semibold text-white">AKAI</span>
        </header>
        <ProgressBar currentStep="connect_calendar" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📅</span>
                </div>
                <h2 className="text-xl font-black text-white mb-2">Connect your calendar</h2>
                <p className="text-gray-400 text-sm">So clients can book meetings with your real availability — 24/7</p>
                {state.data.emailConnected && (
                  <p className="mt-2 text-xs text-[#D4AF37]/80">
                    ✓ Email connected ({state.data.emailConnected === 'google' ? 'Google' : 'Microsoft'})
                  </p>
                )}
              </div>
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleGoogleCalendar}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-white text-black hover:bg-gray-100 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#FFC107"/>
                    <path d="M3.15295 7.3455L6.43845 9.755C7.32745 7.554 9.48045 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C8.15895 2 4.82795 4.1685 3.15295 7.3455Z" fill="#FF3D00"/>
                    <path d="M12 22C14.583 22 16.93 21.0115 18.7045 19.404L15.6095 16.785C14.5718 17.5742 13.3038 18.001 12 18C9.39903 18 7.19053 16.3415 6.35853 14.027L3.09753 16.5395C4.75253 19.778 8.11353 22 12 22Z" fill="#4CAF50"/>
                    <path d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L15.6095 16.7845L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#1976D2"/>
                  </svg>
                  Connect Google Calendar
                </button>
                <button
                  onClick={handleMicrosoftCalendar}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#2a2a2a] text-white hover:bg-[#333] border border-[#3a3a3a] transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.4 2H2V11.4H11.4V2Z" fill="#F25022"/>
                    <path d="M22 2H12.6V11.4H22V2Z" fill="#7FBA00"/>
                    <path d="M11.4 12.6H2V22H11.4V12.6Z" fill="#00A4EF"/>
                    <path d="M22 12.6H12.6V22H22V12.6Z" fill="#FFB900"/>
                  </svg>
                  Connect Outlook Calendar
                </button>
              </div>
              <div className="text-center">
                <button
                  onClick={() => setState(s => ({ ...s, step: 'terms' }))}
                  className="text-sm text-gray-500 hover:text-gray-300 transition"
                >
                  Skip for now →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Terms step — native UI (not AI chat)
  if (state.step === 'terms') {
    const [termsChecked, setTermsChecked] = [
      state.data.termsAccepted || false,
      (v: boolean) => setState(s => ({ ...s, data: { ...s.data, termsAccepted: v } })),
    ];
    const acceptTerms = async () => {
      if (!termsChecked) return;
      const acceptedAt = new Date().toISOString();
      setState(s => ({ ...s, data: { ...s.data, termsAccepted: true, termsAcceptedAt: acceptedAt }, step: 'complete' }));
      await handleComplete({ ...state, data: { ...state.data, termsAccepted: true, termsAcceptedAt: acceptedAt }, step: 'complete' });
    };
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <header className="flex items-center gap-3 px-6 py-4 border-b border-[#1f1f1f]">
          <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs">AK</div>
          <span className="font-semibold text-white">AKAI</span>
        </header>
        <ProgressBar currentStep="terms" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <h2 className="text-xl font-black text-white mb-2">Almost there!</h2>
                <p className="text-gray-400 text-sm">Review and accept our Terms of Service to activate your free trial.</p>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-6 max-h-48 overflow-y-auto">
                <p className="text-gray-400 text-xs leading-relaxed">
                  By using AKAI you agree to our <a href="https://getakai.ai/terms" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline">Terms of Service</a> (effective 22 April 2026).
                  Key points: AKAI provides AI-powered business automation. You retain ownership of your data. 
                  Sophie (AI voice) calls comply with AU ACL and US FCC/TCPA. 
                  
                  We never sell your data. Full terms at getakai.ai/terms.
                </p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer mb-6" onClick={() => setTermsChecked(!termsChecked)}>
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${termsChecked ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-[#3a3a3a] bg-transparent'}`}>
                  {termsChecked && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <span className="text-sm text-gray-300">
                  I have read and agree to the <a href="https://getakai.ai/terms" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline">Terms of Service</a>
                </span>
              </label>
              <button
                onClick={acceptTerms}
                disabled={!termsChecked || completing}
                className={`w-full py-4 rounded-xl font-black text-sm transition-all ${termsChecked && !completing ? 'bg-[#D4AF37] text-black hover:opacity-90' : 'bg-[#2a2a2a] text-gray-600 cursor-not-allowed'}`}
              >
                {completing ? 'Setting up your account...' : 'Activate Free Trial →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-[#1f1f1f]">
        <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs">
          AK
        </div>
        <span className="font-semibold text-white">AKAI</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:block">{user.email}</span>
          <button
            onClick={() => router.replace('/dashboard')}
            className="text-xs text-[#D4AF37]/70 hover:text-[#D4AF37] transition font-medium"
          >
            Skip setup →
          </button>
          <button
            onClick={logout}
            className="text-xs text-white/30 hover:text-white/60 transition"
          >
            Sign out
          </button>
        </span>
      </header>

      {/* Progress bar */}
      <div className="border-b border-[#1f1f1f] flex-shrink-0">
        <ProgressBar currentStep={state.step} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            message={msg}
            onButtonClick={async (label) => {
              setInput(label);
              await new Promise(r => setTimeout(r, 50));
              setInput('');
              const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: label, timestamp: new Date().toISOString() };
              setMessages(prev => [...prev, userMsg]);
              setChatLoading(true);
              try {
                const res = await fetch('/api/onboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: label, state, uid: user.uid }) });
                const data = await res.json() as { message?: string; buttons?: Array<{label: string; primary?: boolean; url?: string}>; state?: typeof state; action?: string };
                if (data.message) setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: data.message!, timestamp: new Date().toISOString(), buttons: data.buttons, action: data.action }]);
                if (data.state) {
                  const resolvedState: OnboardState = data.state.step === 'calendar'
                    ? { ...data.state, step: 'connect_email' }
                    : data.state;
                  setState(resolvedState);
                  if (resolvedState.step === 'complete' && data.action === 'complete') await handleComplete(resolvedState);
                }
              } catch { /* ignore */ } finally { setChatLoading(false); }
            }}
          />
        ))}
        {(chatLoading || completing) && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            {completing ? 'Setting up your account...' : 'AK is thinking...'}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1f1f1f] px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={completing ? 'Setting up your account...' : 'Type your answer...'}
            disabled={completing}
            className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition disabled:opacity-50"
          />
          <Button onClick={sendMessage} disabled={chatLoading || completing || !input.trim()}>
            Send →
          </Button>
        </div>
        {/* Step hint */}
        {STEP_HINTS[state.step] && (
          <div className="max-w-2xl mx-auto mt-2">
            <p className="text-xs text-[#D4AF37]/60 flex items-center gap-1.5">
              <span>💡</span>
              <span>{STEP_HINTS[state.step]}</span>
            </p>
          </div>
        )}
        <div className="max-w-2xl mx-auto mt-2 flex justify-end">
          <button
            onClick={() => router.replace('/dashboard')}
            className="text-xs text-gray-600 hover:text-gray-400 transition"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}
