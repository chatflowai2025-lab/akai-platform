'use client';

import { useEffect, useRef, createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseStorage, getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import Sidebar from './Sidebar';
import { isSafeMode } from '@/lib/beta-config';
import type { ChatMessage } from '@/lib/shared-types';

// ── Chat context ──────────────────────────────────────────────────────────────
interface ChatContextValue { sendMessage: (text: string) => void; }
const ChatContext = createContext<ChatContextValue>({ sendMessage: () => {} });
export const useDashboardChat = () => useContext(ChatContext);

const INITIAL: ChatMessage = {
  id: '1', role: 'assistant',
  content: "Hey! I'm AK. Ask me anything — connect your inbox, launch a campaign, or just tell me what you need.",
  timestamp: '2026-01-01T00:00:00.000Z', // static to avoid SSR/client hydration mismatch
};

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useAuth();

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
    setDoc(chatRef, { messages: messages.slice(-50), updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  }, [messages, user]);

  // Load chat history from Firestore on mount
  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) return;
    const chatRef = doc(db, 'users', user.uid, 'chat', 'history');
    getDoc(chatRef).then(snap => {
      if (snap.exists()) {
        const saved = snap.data()?.messages;
        if (Array.isArray(saved) && saved.length > 0) {
          setMessages(saved);
        }
      }
    }).catch(() => {});
  }, [user]);

  // Load user's onboarding config for AK context
  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      const d = snap.data();
      setUserContext({
        ...(d?.campaignConfig || {}),
        email: user.email || '',
        displayName: user.displayName || d?.displayName || '',
        businessName: d?.businessName || d?.campaignConfig?.businessName || '',
      });
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          state: chatState,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          userContext,
        }),
      });
      let data: { state?: unknown; message?: string; buttons?: unknown; action?: string; url?: string; error?: string } = {};
      try { data = await res.json(); } catch { /* non-JSON response (e.g. 504 gateway timeout) */ }
      if (data.state) setChatState(data.state as typeof chatState);
      const reply = data.message || (data.error ? `Error: ${data.error}` : null);
      if (reply) {
        setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: reply, timestamp: new Date().toISOString(), buttons: data.buttons as ChatMessage['buttons'] }]);
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
  }, [loading, chatState, messages, router, user]);

  const send = () => { const t = input.trim(); setInput(''); sendRaw(t); };

  return (
      <aside className="w-80 flex-shrink-0 border-l border-[#1f1f1f] flex flex-col bg-[#080808] h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1f1f1f] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs flex-shrink-0">AK</div>
            <span className="font-semibold text-sm text-white">Ask AK</span>
            <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
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
                <div className="flex gap-1 items-center">
                  {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

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
              placeholder={user?.email === 'mrakersten@gmail.com' ? 'Ask AK or feedback: ...' : 'Ask AK anything...'}
              className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition min-w-0" />
            <button onClick={send} disabled={loading || !input.trim()}
              className="px-3 py-2 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition flex-shrink-0">→</button>
          </div>
        </div>
      </aside>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
function DashboardLayoutInner({ children, userEmail }: { children: React.ReactNode; userEmail: string }) {
  const [chatQueue, setChatQueue] = useState<string | null>(null);

  const injectMessage = useCallback((text: string) => {
    setChatQueue(text);
  }, []);

  return (
    <ChatContext.Provider value={{ sendMessage: injectMessage }}>
      <div className="h-screen w-screen bg-[#0a0a0a] flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {userEmail && isSafeMode(userEmail) && (
            <div className="flex-shrink-0 bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-2 flex items-center gap-2">
              <span className="text-yellow-400 text-xs font-semibold">🧪 Beta / Safe Mode — Full experience. No live calls or emails will be sent.</span>
            </div>
          )}
          {children}
        </div>
        <InlineChatPanel externalMessage={chatQueue} onExternalMessageHandled={() => setChatQueue(null)} />
      </div>
    </ChatContext.Provider>
  );
}

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

  return <DashboardLayoutInner userEmail={user?.email || ''}>{children}</DashboardLayoutInner>;
}
