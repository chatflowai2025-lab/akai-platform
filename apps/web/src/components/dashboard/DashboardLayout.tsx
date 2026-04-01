'use client';

import { useEffect, useRef, createContext, useContext, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseStorage, getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import Sidebar from './Sidebar';
import TrialBanner from './TrialBanner';
import TrialExpiredOverlay from './TrialExpiredOverlay';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { isSafeMode, TRIAL_MODE_ACTIVE } from '@/lib/beta-config';
import { isTrailblazerMember } from '@/lib/discord-gates';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import type { ChatMessage } from '@/lib/shared-types';
import { buildUserContext } from '@/lib/firestore-schema';

// ── Chat context ──────────────────────────────────────────────────────────────
interface ChatContextValue { sendMessage: (text: string) => void; }
const ChatContext = createContext<ChatContextValue>({ sendMessage: () => {} });
export const useDashboardChat = () => useContext(ChatContext);

const INITIAL: ChatMessage = {
  id: '1', role: 'assistant',
  content: "Hey! I'm AK — your AI Business Partner. Ask me anything, launch a campaign, or just tell me what you need.",
  timestamp: '2026-01-01T00:00:00.000Z', // static to avoid SSR/client hydration mismatch
};

const SUGGESTED_PROMPTS = [
  '❓ What should I do first?',
  '🔍 Run a health check on my site',
  '📊 Show my leads',
  '✉️ Connect my email',
  '🤖 How does AK work?',
];

const CHAT_HISTORY_KEY = 'akai_chat_history';

function getLocalChatHistory(): string[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function addLocalChatHistory(msg: string): string[] {
  try {
    const prev = getLocalChatHistory();
    const updated = [msg, ...prev.filter(m => m !== msg)].slice(0, 5);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch { return []; }
}

interface ChatState { step: string; data: Record<string, string>; }

// ── Chat panel ────────────────────────────────────────────────────────────────
function InlineChatPanel({ externalMessage, onExternalMessageHandled }: { externalMessage: string | null; onExternalMessageHandled: () => void }) {
  // ── All hooks must be declared before any effects ──────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [chatState, setChatState] = useState<ChatState>({ step: 'idle', data: {} });
  const [userContext, setUserContext] = useState<Record<string, string>>({});
  const [recentHistory, setRecentHistory] = useState<string[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [memoryTurns, setMemoryTurns] = useState<Array<{ userMessage: string; akResponse: string; timestamp: string; date: string }>>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  // Load local chat history (client-side only)
  useEffect(() => {
    setRecentHistory(getLocalChatHistory());
  }, []);

  // Handle messages injected from page buttons (e.g. quick-action buttons)
  useEffect(() => {
    if (externalMessage) {
      sendRaw(externalMessage);
      onExternalMessageHandled();
    }
  }, [externalMessage]); // eslint-disable-line

  // Persist chat to Firestore
  useEffect(() => {
    if (!user || messages.length <= 1) return; // skip initial message
    const db = getFirebaseDb();
    if (!db) return;
    const chatRef = doc(db, 'users', user.uid, 'chat', 'history');
    // Strip undefined fields before saving — Firestore rejects undefined values
    const sanitized = messages.slice(-50).map(m => {
      const clean: Record<string, unknown> = { id: m.id, role: m.role, content: m.content, timestamp: m.timestamp };
      if (m.buttons !== undefined) clean.buttons = m.buttons;
      return clean;
    });
    setDoc(chatRef, { messages: sanitized, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  }, [messages, user]);

  // Load chat history from Firestore on mount; inject welcome message on first login
  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) return;
    const chatRef = doc(db, 'users', user.uid, 'chat', 'history');
    getDoc(chatRef).then(async snap => {
      if (snap.exists()) {
        const saved = snap.data()?.messages;
        if (Array.isArray(saved) && saved.length > 0) {
          setMessages(saved);
          return;
        }
      }
      // No prior chat history — check if onboarding is complete and inject welcome message
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data() || {};
        const isOnboarded =
          userData?.onboardingComplete === true ||
          !!userData?.businessName ||
          !!userData?.onboarding?.businessName;
        if (isOnboarded) {
          const firstName =
            userData?.onboarding?.businessName ||
            userData?.businessName ||
            user.displayName ||
            user.email?.split('@')[0] ||
            'there';
          const welcomeMsg: ChatMessage = {
            id: 'welcome-1',
            role: 'assistant',
            content: `Hey ${firstName}! I'm AK — your AI business partner. I've set up your account based on what you told me. What would you like to tackle first — leads, email, or something else?`,
            timestamp: new Date().toISOString(),
          };
          setMessages([welcomeMsg]);
        }
      } catch { /* non-fatal */ }
    }).catch(() => {});
  }, [user]);

  // Load user's onboarding config for AK context
  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      const d = snap.data() || {};
      // Use canonical schema helpers — never guess field paths here
      setUserContext({
        ...(d?.campaignConfig || {}),
        ...buildUserContext(d, user),
      });
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    // Only scroll when a new message is genuinely added (not on module navigation or initial load)
    if (messages.length > prevMessagesLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Poll for email enquiry notifications and inject into chat
  useEffect(() => {
    if (!user) return;
    let active = true;
    const poll = async () => {
      try {
        const db = getFirebaseDb();
        if (!db) return;
        const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
        const q = query(
          collection(db, 'users', user.uid, 'chatNotifications'),
          where('read', '==', false)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          const data = d.data() as { message: string; type: string };
          if (data.message && active) {
            setMessages(p => [...p, {
              id: `notif-${d.id}`,
              role: 'assistant' as const,
              content: data.message,
              timestamp: new Date().toISOString(),
              ...(data.type === 'email_enquiry' ? {
                buttons: [{ label: 'View in Email Guard →', action: 'navigate', url: '/email-guard' }]
              } : {})
            }]);
            await updateDoc(doc(db, 'users', user.uid, 'chatNotifications', d.id), { read: true });
          }
        }
      } catch { /* non-fatal */ }
    };
    poll();
    const interval = setInterval(poll, 30000); // check every 30s
    return () => { active = false; clearInterval(interval); };
  }, [user]);

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const storage = getFirebaseStorage();
    if (!storage) {
      setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: 'Storage not available — please try again.', timestamp: new Date().toISOString() }]);
      setUploading(false);
      return;
    }
    try {
      const path = `uploads/${user.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);
      await new Promise<void>((resolve, reject) => { task.on('state_changed', null, reject, resolve); });
      const url = await getDownloadURL(storageRef);
      setMessages(p => [...p,
        { id: Date.now().toString(), role: 'user', content: `📎 [${file.name}](${url})`, timestamp: new Date().toISOString() },
        { id: (Date.now() + 1).toString(), role: 'assistant', content: `Got it — **${file.name}** is uploaded and private to you. What would you like me to do with it?`, timestamp: new Date().toISOString() },
      ]);
    } catch {
      setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: 'Upload failed — please try again.', timestamp: new Date().toISOString() }]);
    } finally {
      setUploading(false);
    }
  };

  const sendRaw = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    // Feedback shortcut — Aaron only
    if (/^fee?d[ab]?[ae]?c?k?:/i.test(text.trim())) {
      const fb = text.replace(/^fee?d[ab]?[ae]?c?k?:/i, '').trim();
      setMessages(p => [...p, { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date().toISOString() }]);
      try {
        await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feedback: fb, userEmail: user?.email ?? 'unknown' }) });
        setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: "✅ Feedback sent to MM. I'll fix it.", timestamp: new Date().toISOString() }]);
      } catch {
        setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: 'Failed to send feedback — try again.', timestamp: new Date().toISOString() }]);
      }
      return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(p => [...p, userMsg]);
    // Track in local history
    setRecentHistory(addLocalChatHistory(text));
    setLoading(true);

    try {
      // Derive currentModule from pathname (e.g. /email-guard → 'email-guard')
      const currentModule = pathname?.split('/').filter(Boolean)[0] || '';

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          state: chatState,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          userContext,
          currentModule,
        }),
      });
      let data: { state?: unknown; message?: string; buttons?: unknown; action?: string; url?: string; error?: string } = {};
      try { data = await res.json(); } catch { /* non-JSON response (e.g. 504 gateway timeout) */ }
      if (data.state) setChatState(data.state as typeof chatState);
      const reply = data.message || (data.error ? `Error: ${data.error}` : null);
      if (reply) {
        const msg: ChatMessage = { id: Date.now().toString(), role: 'assistant', content: reply, timestamp: new Date().toISOString() };
        if (data.buttons) msg.buttons = data.buttons as ChatMessage['buttons'];
        setMessages(p => [...p, msg]);
      } else if (!data.message && !data.error) {
        // Empty or unrecognised response — show fallback
        setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: 'Something went wrong. Try again.', timestamp: new Date().toISOString() }]);
      }
      if (data.action === 'redirect' && data.url) {
        const url: string = data.url;
        if (url.startsWith('/')) router.push(url);
      }
    } catch {
      setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: 'Something went wrong. Try again.', timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }, [loading, chatState, messages, router, user, pathname, userContext]);

  const send = () => { const t = input.trim(); setInput(''); sendRaw(t); };

  const saveFeedback = useCallback(async (messageId: string, content: string, rating: 'up' | 'down') => {
    if (!user) return;
    try {
      const db = getFirebaseDb();
      if (!db) return;
      await setDoc(
        doc(db, 'users', user.uid),
        { chatFeedback: { [messageId]: { rating, message: content, timestamp: new Date().toISOString() } } },
        { merge: true }
      );
    } catch { /* non-fatal */ }
  }, [user]);

  const fetchMemory = useCallback(async () => {
    if (!user) return;
    setMemoryLoading(true);
    try {
      const res = await fetch(`/api/chat/memory?userId=${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setMemoryTurns(data.turns || []);
      }
    } catch { /* non-fatal */ } finally {
      setMemoryLoading(false);
    }
  }, [user]);

  const toggleMemory = useCallback(() => {
    setShowMemory(prev => {
      if (!prev) fetchMemory();
      return !prev;
    });
  }, [fetchMemory]);

  const isOnlyInitialMessage = messages.length === 1 && (messages[0]?.id === '1' || messages[0]?.id === 'welcome-1');

  return (
      <aside className="w-80 flex-shrink-0 border-l border-[#1f1f1f] flex flex-col bg-[#080808] h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1f1f1f] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs flex-shrink-0">AK</div>
            <div className="flex flex-col"><span className="font-semibold text-sm text-white leading-none">AK</span><span className="text-[10px] text-gray-500 leading-none">Your AI Business Partner</span></div>
            <button
              onClick={toggleMemory}
              title="View conversation memory"
              className={`ml-auto text-xs px-2 py-1 rounded-lg border transition flex-shrink-0 ${showMemory ? 'border-[#D4AF37]/60 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-[#2a2a2a] text-gray-500 hover:text-gray-300 hover:border-[#3a3a3a]'}`}
            >🧠</button>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.map(m => (
            <div key={m.id}>
              <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#D4AF37] text-black font-medium rounded-br-sm'
                    : 'bg-[#1a1a1a] text-white/90 rounded-bl-sm border border-[#2a2a2a]'
                }`}>{m.content}</div>
              </div>
              {m.role === 'assistant' && m.id !== '1' && (
                <div className="flex gap-1 mt-1 ml-1">
                  <button
                    onClick={() => saveFeedback(m.id, m.content, 'up')}
                    className="text-xs px-1.5 py-0.5 rounded hover:bg-[#1a1a1a] text-gray-600 hover:text-green-400 transition"
                    title="Good response"
                  >👍</button>
                  <button
                    onClick={() => saveFeedback(m.id, m.content, 'down')}
                    className="text-xs px-1.5 py-0.5 rounded hover:bg-[#1a1a1a] text-gray-600 hover:text-red-400 transition"
                    title="Bad response"
                  >👎</button>
                </div>
              )}
              {m.buttons && m.buttons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                  {m.buttons.map(btn => (
                    <button key={btn.label} onClick={() => sendRaw(btn.label)} disabled={loading}
                      className="text-xs px-2.5 py-1 rounded-lg border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition disabled:opacity-40">
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
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                  <span className="text-xs text-gray-500">AK is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Suggested prompts — only shown when chat is fresh */}
          {isOnlyInitialMessage && !loading && (
            <div className="space-y-2 mt-2">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Try asking</p>
              <div className="flex flex-col gap-1.5">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendRaw(prompt)}
                    className="text-left text-xs px-3 py-2 rounded-xl border border-[#2a2a2a] bg-[#111] text-gray-300 hover:border-[#D4AF37]/40 hover:text-white hover:bg-[#1a1a1a] transition"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {recentHistory.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Recent</p>
                  {recentHistory.map(msg => (
                    <button
                      key={msg}
                      onClick={() => sendRaw(msg)}
                      className="w-full text-left text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#111] transition truncate"
                    >
                      ↩ {msg}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Memory Panel */}
        {showMemory && (
          <div className="border-t border-[#1f1f1f] flex-shrink-0 max-h-64 overflow-y-auto bg-[#060606]">
            <div className="px-3 py-2 flex items-center justify-between border-b border-[#1a1a1a]">
              <span className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-wider">🧠 Memory</span>
              <button onClick={fetchMemory} disabled={memoryLoading} className="text-[10px] text-gray-500 hover:text-gray-300 transition">{memoryLoading ? '⏳' : '↻ Refresh'}</button>
            </div>
            {memoryLoading && <div className="px-3 py-4 text-xs text-gray-600 text-center">Loading memory...</div>}
            {!memoryLoading && memoryTurns.length === 0 && <div className="px-3 py-4 text-xs text-gray-600 text-center">No conversation history yet.</div>}
            {!memoryLoading && memoryTurns.length > 0 && (
              <div className="divide-y divide-[#1a1a1a]">
                {memoryTurns.slice(0, 10).map((turn, i) => (
                  <button
                    key={i}
                    onClick={() => { sendRaw(turn.userMessage); setShowMemory(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-[#1a1a1a] transition group"
                  >
                    <div suppressHydrationWarning className="text-[10px] text-gray-600 mb-0.5">{new Date(turn.timestamp).toLocaleString('en-AU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-xs text-gray-300 truncate group-hover:text-white">You: {turn.userMessage?.slice(0, 80)}</div>
                    <div className="text-xs text-gray-600 truncate mt-0.5">AK: {turn.akResponse?.slice(0, 80)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-[#1f1f1f] flex-shrink-0">
          <input ref={fileInputRef} type="file" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading || loading} title="Attach file"
              className="px-2.5 py-2 bg-[#1a1a1a] border border-[#1f1f1f] text-gray-400 rounded-lg hover:text-white hover:border-[#D4AF37]/30 disabled:opacity-40 transition flex-shrink-0 text-sm">
              {uploading ? '⏳' : '📎'}
            </button>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={isTrailblazerMember(user?.email ?? '') ? 'Ask AK anything — or share feedback...' : 'Ask AK anything...'}
              aria-label="Message AK"
              className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition min-w-0" />
            <button onClick={send} disabled={loading || !input.trim()} aria-label="Send message"
              className="px-3 py-2 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition flex-shrink-0">→</button>
          </div>
        </div>
      </aside>
  );
}

// ── Mobile Menu Drawer ────────────────────────────────────────────────────────
const MODULE_LINKS = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/sales', icon: '📞', label: 'Sales' },
  { href: '/voice', icon: '🎙️', label: 'Voice' },
  { href: '/web', icon: '🌐', label: 'Web' },
  { href: '/seo', icon: '🔍', label: 'SEO' },
  { href: '/gbp', icon: '📍', label: 'GBP' },
  { href: '/email-guard', icon: '✉️', label: 'Email Guard' },
  { href: '/calendar', icon: '📅', label: 'Calendar' },
  { href: '/proposals', icon: '📄', label: 'Proposals' },
  { href: '/ads', icon: '📣', label: 'Ads' },
  { href: '/recruit', icon: '🎯', label: 'Recruit' },
  { href: '/social', icon: '📱', label: 'Social' },
  { href: '/health', icon: '🏥', label: 'Health' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
];

function MobileMenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f0f] border-t border-[#2a2a2a] rounded-t-2xl md:hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1f1f1f]">
          <span className="text-sm font-bold text-white">All Skills</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none" aria-label="Close">×</button>
        </div>
        <div className="grid grid-cols-3 gap-px bg-[#1f1f1f] max-h-[60vh] overflow-y-auto">
          {MODULE_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="flex flex-col items-center gap-1.5 py-4 px-2 bg-[#0f0f0f] hover:bg-[#1a1a1a] transition active:bg-[#222]"
            >
              <span className="text-2xl">{link.icon}</span>
              <span className="text-[11px] text-gray-400 font-medium text-center leading-tight">{link.label}</span>
            </a>
          ))}
        </div>
        <div className="h-safe-bottom pb-2" />
      </div>
    </>
  );
}

// ── Mobile Bottom Nav ─────────────────────────────────────────────────────────
function MobileBottomNav({
  onChatOpen,
  onMenuOpen,
}: {
  onChatOpen: () => void;
  onMenuOpen: () => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0a0a0a] border-t border-[#1f1f1f] flex items-center md:hidden pb-safe" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <a
        href="/dashboard"
        className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-white active:text-[#D4AF37] transition"
      >
        <span className="text-xl">📊</span>
        <span className="text-[10px] font-medium">Home</span>
      </a>
      <a
        href="/sales"
        className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-white active:text-[#D4AF37] transition"
      >
        <span className="text-xl">📞</span>
        <span className="text-[10px] font-medium">Sales</span>
      </a>
      <button
        onClick={onChatOpen}
        className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-white active:text-[#D4AF37] transition"
      >
        <span className="text-xl">💬</span>
        <span className="text-[10px] font-medium">AK Chat</span>
      </button>
      <button
        onClick={onMenuOpen}
        className="flex-1 flex flex-col items-center gap-1 py-3 text-gray-400 hover:text-white active:text-[#D4AF37] transition"
      >
        <span className="text-xl">☰</span>
        <span className="text-[10px] font-medium">Menu</span>
      </button>
    </nav>
  );
}

// ── Mobile Chat Overlay ───────────────────────────────────────────────────────
function MobileChatOverlay({
  open,
  onClose,
  chatQueue,
  onChatHandled,
}: {
  open: boolean;
  onClose: () => void;
  chatQueue: string | null;
  onChatHandled: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#080808] md:hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs">AK</div>
          <div className="flex flex-col"><span className="font-semibold text-sm text-white leading-none">AK</span><span className="text-[10px] text-gray-500 leading-none">Your AI Business Partner</span></div>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none" aria-label="Close">×</button>
      </div>
      <div className="flex-1 overflow-hidden">
        <InlineChatPanel externalMessage={chatQueue} onExternalMessageHandled={onChatHandled} />
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
function DashboardLayoutInner({
  children,
  userEmail,
  noChat,
}: {
  children: React.ReactNode;
  userEmail: string;
  noChat?: boolean;
}) {
  const [chatQueue, setChatQueue] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const trial = useTrialStatus(TRIAL_MODE_ACTIVE ? user : null);

  const injectMessage = useCallback((text: string) => {
    setChatQueue(text);
  }, []);

  return (
    <ChatContext.Provider value={{ sendMessage: injectMessage }}>
      <div className="h-screen w-screen bg-[#0a0a0a] flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 pb-16 md:pb-0">
          {userEmail && isSafeMode(userEmail) && (
            <div className="flex-shrink-0 bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-2 flex items-center gap-2">
              <span className="text-yellow-400 text-xs font-semibold">🧪 Beta / Safe Mode — Full experience. No live calls or emails will be sent.</span>
            </div>
          )}
          {/* Trial banner — renders nothing when TRIAL_MODE_ACTIVE=false or user is a Trailblazer */}
          <TrialBanner trial={trial} />
          <ErrorBoundary>
            {/* Relative wrapper so the expired overlay can position itself */}
            <div className="relative flex flex-col flex-1 overflow-hidden min-h-0">
              <TrialExpiredOverlay show={trial.status === 'expired'} />
              {children}
            </div>
          </ErrorBoundary>
        </div>
        {!noChat && (
          <div className="hidden md:flex">
            <InlineChatPanel
              externalMessage={chatQueue}
              onExternalMessageHandled={() => setChatQueue(null)}
            />
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav
        onChatOpen={() => setMobileChatOpen(true)}
        onMenuOpen={() => setMobileMenuOpen(true)}
      />

      {/* Mobile chat overlay */}
      {!noChat && (
        <MobileChatOverlay
          open={mobileChatOpen}
          onClose={() => setMobileChatOpen(false)}
          chatQueue={chatQueue}
          onChatHandled={() => setChatQueue(null)}
        />
      )}

      {/* Mobile menu drawer */}
      <MobileMenuDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </ChatContext.Provider>
  );
}

export default function DashboardLayout({
  children,
  noChat,
}: {
  children: React.ReactNode;
  noChat?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex overflow-hidden">
        <div className="w-[220px] flex-shrink-0 bg-[#080808] border-r border-[#1f1f1f] animate-pulse" />
        <PageSkeleton />
      </div>
    );
  }

  return (
    <DashboardLayoutInner userEmail={user?.email || ''} noChat={noChat}>
      {children}
    </DashboardLayoutInner>
  );
}
