'use client';

import { useEffect, useRef, createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseStorage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import Sidebar from './Sidebar';
import type { ChatMessage } from '@/lib/shared-types';

// ── Chat context ──────────────────────────────────────────────────────────────
interface ChatContextValue { sendMessage: (text: string) => void; }
const ChatContext = createContext<ChatContextValue>({ sendMessage: () => {} });
export const useDashboardChat = () => useContext(ChatContext);

const INITIAL: ChatMessage = {
  id: '1', role: 'assistant',
  content: "Hey! I'm AK. Ask me anything — connect your inbox, launch a campaign, or just tell me what you need.",
  timestamp: new Date().toISOString(),
};

interface ChatState { step: string; data: Record<string, string>; }

// ── Chat panel ────────────────────────────────────────────────────────────────
function InlineChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [chatState, setChatState] = useState<ChatState>({ step: 'idle', data: {} });
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useAuth();

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
    if (text.toLowerCase().startsWith('feedback:') && user?.email === 'mrakersten@gmail.com') {
      const fb = text.slice(9).trim();
      setMessages(p => [...p, { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date().toISOString() }]);
      try {
        await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feedback: fb, userEmail: user.email }) });
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
        }),
      });
      const data = await res.json();
      if (data.state) setChatState(data.state);
      if (data.message) {
        setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: data.message, timestamp: new Date().toISOString(), buttons: data.buttons }]);
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
    <ChatContext.Provider value={{ sendMessage: sendRaw }}>
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
    </ChatContext.Provider>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </div>
      <InlineChatPanel />
    </div>
  );
}
