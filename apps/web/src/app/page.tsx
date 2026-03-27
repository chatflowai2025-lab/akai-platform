'use client';

import { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import AITeam from '@/components/landing/AITeam';
import SocialProof from '@/components/landing/SocialProof';
import HowItWorks from '@/components/landing/HowItWorks';
import Modules from '@/components/landing/Modules';
import Pricing from '@/components/landing/Pricing';
import Footer from '@/components/landing/Footer';

interface Msg { role: 'user' | 'assistant'; content: string; }

const INITIAL: Msg = { role: 'assistant', content: "Hey! I'm AK — your AI Business Partner. Ask me anything about AKAI — pricing, how it works, or just tell me what your business needs." };

function HomepageChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(p => [...p, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })) }),
      });
      let data: { message?: string } = {};
      try { data = await res.json(); } catch { /* non-json */ }
      setMessages(p => [...p, { role: 'assistant', content: data.message || "Let me connect you with the team — book a demo above and we'll be in touch." }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Something went wrong. Try again or book a demo above.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="w-80 sm:w-96 bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '480px' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-[#0d0d0d]">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-black text-sm">AK</div>
            <div>
              <p className="text-sm font-bold text-white">AK — Your AI Business Partner</p>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-[10px] text-gray-500">Online now</span></div>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-gray-500 hover:text-white transition text-lg leading-none">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#D4AF37] text-black font-medium rounded-br-sm' : 'bg-[#1a1a1a] text-white/90 rounded-bl-sm border border-[#2a2a2a]'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1">{[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[#1f1f1f] flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask anything..."
              className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
            />
            <button onClick={send} disabled={loading || !input.trim()} className="px-3 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition">→</button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <div className="flex items-center gap-3">
        {!open && (
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-white leading-none">AK</span>
            <span className="text-[10px] text-white/40 leading-none whitespace-nowrap">Your AI Business Partner</span>
          </div>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-14 h-14 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shadow-lg shadow-[#D4AF37]/30 hover:opacity-90 transition-all active:scale-95"
          aria-label="Chat with AK"
        >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" /></svg>
        )}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <Hero />
      <AITeam />
      <SocialProof />
      <HowItWorks />
      <Modules />
      <Pricing />
      <Footer />
      <HomepageChat />
    </main>
  );
}
