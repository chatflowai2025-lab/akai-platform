'use client';

import { useEffect, useRef, createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from './Sidebar';
import type { ChatMessage } from '@/lib/shared-types';

// ── Chat context — lets any child button inject a message into AK ─────────
interface ChatContextValue {
  sendMessage: (text: string) => void;
}
const ChatContext = createContext<ChatContextValue>({ sendMessage: () => {} });
export const useDashboardChat = () => useContext(ChatContext);

const INITIAL: ChatMessage = {
  id: '1',
  role: 'assistant',
  content: "Hey! I'm AK. Ask me anything — launch a campaign, check your pipeline, configure Email Guard, or just tell me what you need.",
  timestamp: new Date().toISOString(),
};

interface ChatState {
  step: string;
  data: Record<string, string>;
}

// ── Inline ChatPanel (lives inside layout so it persists across pages) ────
function InlineChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatState, setChatState] = useState<ChatState>({ step: 'idle', data: {} });
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendRaw = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(p => [...p, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, state: chatState }),
      });
      const data = await res.json();
      if (data.state) setChatState(data.state);
      if (data.message) {
        setMessages(p => [...p, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          buttons: data.buttons,
        }]);
      }
      // Navigate inside the app — no new tabs
      if (data.action === 'redirect' && data.url) {
        const url: string = data.url;
        if (url.startsWith('/') || url.startsWith(window.location.origin)) {
          router.push(url.replace(window.location.origin, ''));
        }
        // external links: ignore — keep user in the platform
      }
    } catch {
      setMessages(p => [...p, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, something went wrong. Try again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, chatState, router]);

  const send = () => {
    const text = input.trim();
    setInput('');
    sendRaw(text);
  };

  return (
    <ChatContext.Provider value={{ sendMessage: sendRaw }}>
      <aside className="w-80 flex-shrink-0 border-l border-[#1f1f1f] flex flex-col bg-[#080808] h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1f1f1f] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs flex-shrink-0">
              AK
            </div>
            <span className="font-semibold text-sm text-white">Ask AK</span>
            <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.map(m => (
            <div key={m.id}>
              <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#D4AF37] text-black font-medium rounded-br-sm'
                    : 'bg-[#1a1a1a] text-white/90 rounded-bl-sm border border-[#2a2a2a]'
                }`}>
                  {m.content}
                </div>
              </div>
              {m.buttons && m.buttons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                  {m.buttons.map((btn) => (
                    <button
                      key={btn.label}
                      onClick={() => sendRaw(btn.label)}
                      disabled={loading}
                      className="text-xs px-2.5 py-1 rounded-lg border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition disabled:opacity-40"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl rounded-bl-sm px-3 py-2">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{animationDelay:'0ms'}}/>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{animationDelay:'150ms'}}/>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{animationDelay:'300ms'}}/>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-[#1f1f1f] flex-shrink-0">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask AK anything..."
              className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition min-w-0"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition flex-shrink-0"
            >
              →
            </button>
          </div>
        </div>
      </aside>
    </ChatContext.Provider>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
      <InlineChatPanel />
    </div>
  );
}
