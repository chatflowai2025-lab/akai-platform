'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import type { ChatMessage, OnboardingState } from '@akai/shared-types';
import ChatBubble from '@/components/ui/ChatBubble';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';

const INITIAL_MESSAGE: ChatMessage = {
  id: '1',
  role: 'assistant',
  content: "Hi, I'm AK — your AI business partner. I'm here to build, run, and grow your business while you focus on closing deals.\n\nLet's get your AKAI OS set up in 2 minutes.\n\nFirst — what industry are you in?",
  timestamp: new Date().toISOString(),
};

export default function OnboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    step: 'business_name',
    data: {},
  });

  // Auth gate
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, state, messages }),
      });
      const data = await res.json();

      if (data.message) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          buttons: data.buttons,
          action: data.action,
        }]);
      }

      if (data.state) setState(data.state);
      if (data.action === 'redirect') {
        // Mark onboarding complete in Firestore
        if (user?.uid) {
          try {
            const db = getFirebaseDb();
            if (db) {
              await updateDoc(doc(db, 'users', user.uid), {
                onboardingComplete: true,
              });
            }
          } catch (err) {
            console.error('Failed to mark onboarding complete:', err);
          }
        }
        setTimeout(() => window.location.href = data.url || '/dashboard', 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  // Show nothing while auth resolves (redirect happens in useEffect)
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
        {chatLoading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            AK is thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#1f1f1f] px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type your answer..."
            className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
          />
          <Button onClick={sendMessage} disabled={chatLoading || !input.trim()}>
            Send →
          </Button>
        </div>
      </div>
    </div>
  );
}
