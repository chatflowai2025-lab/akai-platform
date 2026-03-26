'use client';


import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import type { ChatMessage } from '@/lib/shared-types';
import ChatBubble from '@/components/ui/ChatBubble';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';

// ---------------------------------------------------------------------------
// Onboarding types (local — more specific than shared OnboardingState)
// ---------------------------------------------------------------------------

type OnboardStep = 'industry' | 'business_name' | 'goal' | 'location' | 'contact' | 'complete';

interface OnboardData {
  industry?: string;
  businessName?: string;
  goal?: string;
  location?: string;
  contact?: string;
}

interface OnboardState {
  step: OnboardStep;
  data: OnboardData;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: '1',
  role: 'assistant',
  content: "Hi, I'm AK — your AI business partner. I'm here to build, run, and grow your business while you focus on closing deals.\n\nLet's get your AKAI OS set up in 2 minutes.\n\nFirst — what industry are you in?",
  timestamp: new Date().toISOString(),
};

const RAILWAY_API = 'https://api-server-production-2a27.up.railway.app';
const RAILWAY_API_KEY = 'aiclozr_api_key_2026_prod';

export default function OnboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [state, setState] = useState<OnboardState>({
    step: 'industry',
    data: {},
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    const { businessName, industry, goal, location, contact } = finalState.data;

    try {
      const db = getFirebaseDb();
      if (db) {
        // Save full onboarding data + mark complete
        await setDoc(
          doc(db, 'users', user.uid),
          {
            onboarding: {
              businessName: businessName || '',
              industry: industry || '',
              goal: goal || '',
              location: location || '',
              contact: contact || '',
              completedAt: new Date().toISOString(),
            },
            onboardingComplete: true,
            businessName: businessName || '',
            displayName: businessName || '',
          },
          { merge: true }
        );
        console.log('[ONBOARD] Firestore saved for', user.uid);
      }
    } catch (err) {
      console.error('[ONBOARD] Firestore save failed (non-fatal):', err);
    }

    // Call Railway to configure account
    try {
      const res = await fetch(`${RAILWAY_API}/api/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': RAILWAY_API_KEY,
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email || contact || '',
          name: user.displayName || businessName || '',
          businessName: businessName || '',
          industry: industry || '',
          location: location || '',
          contact: contact || '',
          uid: user.uid,
          selectedPlan: 'trial',
        }),
      });
      const data = await res.json();
      console.log('[ONBOARD] Railway response:', data);
    } catch (err) {
      console.error('[ONBOARD] Railway call failed (non-fatal):', err);
    }

    // Redirect to dashboard
    setTimeout(() => {
      router.replace('/dashboard');
    }, 1500);
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
        setState(data.state);

        // When step is 'complete', trigger account setup
        if (data.state.step === 'complete' && data.action === 'complete') {
          await handleComplete(data.state);
        }
      }
    } catch (err) {
      console.error('[ONBOARD]', err);
    } finally {
      setChatLoading(false);
    }
  };

  // Show nothing while auth resolves
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-[#1f1f1f]">
        <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-sm">
          A
        </div>
        <span className="font-semibold text-white">AKAI Setup</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:block">{user.email}</span>
          <button
            onClick={logout}
            className="text-xs text-white/30 hover:text-white/60 transition"
          >
            Sign out
          </button>
        </span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} />
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
      </div>
    </div>
  );
}
