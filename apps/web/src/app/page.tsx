'use client';

import { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/landing/Navbar';
import Modules from '@/components/landing/Modules';
import Pricing from '@/components/landing/Pricing';
import { DemoModal } from '@/components/landing/Hero';
import LeadCaptureModal from '@/components/LeadCaptureModal';

interface Msg { role: 'user' | 'assistant'; content: string; }

const INITIAL: Msg = {
  role: 'assistant',
  content: "Hey! I'm AK — your AI business partner. 👋\n\nTell me about your business and I'll show you exactly how AKAI can help — from finding leads to closing deals, all on autopilot.",
};

function HomepageChat({ defaultOpen = false, onOpenChange }: { defaultOpen?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(defaultOpen);
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
        body: JSON.stringify({ message: text, history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })), currentModule: 'homepage_sales' }),
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
      {open && (
        <div className="w-80 sm:w-96 bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '480px' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-[#0d0d0d]">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-black text-sm">AK</div>
            <div>
              <p className="text-sm font-bold text-white">AK — Your AI Business Partner</p>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-[10px] text-gray-500">Online now</span></div>
            </div>
            <button onClick={() => { setOpen(false); onOpenChange?.(false); }} aria-label="Close" className="ml-auto text-gray-500 hover:text-white transition text-lg leading-none">×</button>
          </div>
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
          <div className="p-3 border-t border-[#1f1f1f] flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask anything..."
              className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
            />
            <button onClick={send} disabled={loading || !input.trim()} aria-label="Send message" className="px-3 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition">→</button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        {!open && (
          <div className="flex flex-col items-end bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5">
            <span className="text-sm font-bold text-white leading-none">AK</span>
            <span className="text-xs text-white/70 leading-none whitespace-nowrap">Your AI Business Partner</span>
          </div>
        )}
        <button
          onClick={() => { setOpen(o => { onOpenChange?.(!o); return !o; }); }}
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

/* ─── Trust Bar ─── */
function TrustBar() {
  const items = [
    '10 AI agents working for you',
    'Relentless pursuit of excellence',
    'Automate your business through a prompt',
    'You focus on growth — we handle the rest',
  ];
  return (
    <div className="w-full bg-[#0d0d0d] border-y border-[#1f1f1f] py-3 overflow-hidden">
      <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-1 px-4">
        {items.map((item, i) => (
          <span key={item} className="flex items-center gap-2 text-sm text-gray-500 whitespace-nowrap">
            {i > 0 && <span className="text-[#D4AF37]/40 hidden sm:inline">·</span>}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Hero ─── */
function Hero({ onOpenCapture, onOpenDemo }: { onOpenCapture: () => void; onOpenDemo: () => void }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[#D4AF37]/[0.04] rounded-full blur-[140px]" />
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-[#D4AF37]/[0.05] rounded-full blur-[90px]" />
      </div>

      {/* Live pill */}
      <div className="inline-flex items-center gap-2 bg-[#111] border border-[#2a2a2a] rounded-full px-4 py-1.5 text-sm text-[#D4AF37] mb-8">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span>Now live</span>
        <span className="w-px h-3 bg-[#2a2a2a]" />
        <span className="text-gray-500">AI business automation from Sydney to New York</span>
      </div>

      {/* Headline */}
      <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-6 leading-[0.9] tracking-tight max-w-5xl">
        <span className="text-white">Stop Losing Deals</span>
        <br />
        <span className="text-[#D4AF37]">While You Sleep.</span>
      </h1>

      {/* Sub */}
      <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
        AK<span className="text-[#D4AF37] font-bold">AI</span> gives you 10 specialist AI agents that answer enquiries, call leads, book meetings, post content, and track your finances —{' '}
        <span className="text-white font-semibold">so you never have to.</span>
      </p>

      {/* CTAs */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <button
            onClick={onOpenCapture}
            aria-label="Start free trial"
            className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] text-black font-bold rounded-xl px-8 py-4 text-base hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20 min-w-[180px]"
          >
            Start free →
          </button>
          <button
            onClick={() => {
              document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
              setTimeout(() => {
                const btn = document.getElementById('demo-play-btn');
                if (btn) btn.click();
              }, 600);
            }}
            className="inline-flex items-center justify-center gap-2 bg-[#111] border border-[#2a2a2a] text-white font-semibold rounded-xl px-8 py-4 text-base hover:border-[#D4AF37]/40 hover:bg-[#1a1a1a] transition-all min-w-[180px]"
          >
            Watch it work →
          </button>
        </div>
        <p className="text-xs text-gray-500">Join 40+ businesses already running on AKAI</p>
      </div>

      {/* Action tiles */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-center w-full max-w-2xl mb-10">
        <a href="/health" className="flex-1 flex items-center gap-3 bg-[#111] border border-[#2a2a2a] hover:border-purple-500/40 hover:bg-purple-500/5 rounded-2xl px-5 py-4 transition-all group text-left">
          <span className="text-2xl">🩺</span>
          <div>
            <p className="text-white font-semibold text-sm group-hover:text-purple-300 transition">Free Digital Health Check</p>
            <p className="text-gray-500 text-xs mt-0.5">See your business blind spots in 60s</p>
          </div>
        </a>
        <button onClick={onOpenDemo} className="flex-1 flex items-center gap-3 bg-[#111] border border-[#2a2a2a] hover:border-green-500/40 hover:bg-green-500/5 rounded-2xl px-5 py-4 transition-all group text-left">
          <span className="text-2xl">🎙️</span>
          <div>
            <p className="text-white font-semibold text-sm group-hover:text-green-300 transition">Try Live AI Agent</p>
            <p className="text-gray-500 text-xs mt-0.5">Sophie calls you in under 60 seconds</p>
          </div>
        </button>
        <a href="/dashboard" className="flex-1 flex items-center gap-3 bg-[#111] border border-[#2a2a2a] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 rounded-2xl px-5 py-4 transition-all group text-left">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-white font-semibold text-sm group-hover:text-[#D4AF37] transition">Launch Your AI Team</p>
            <p className="text-gray-500 text-xs mt-0.5">10 agents live in under 5 minutes</p>
          </div>
        </a>
      </div>

      {/* Stats bar */}
      <div className="w-full max-w-3xl bg-[#111] border border-[#1f1f1f] rounded-2xl px-6 py-5 flex flex-wrap justify-center gap-y-4">
        {[
          { value: '10', label: 'AI Agents', gold: false },
          { value: '24/7', label: 'Always On', gold: false },
          { value: '<60s', label: 'First Response', gold: true },
          { value: '$0', label: 'In Hiring', gold: true },
        ].map((stat, i, arr) => (
          <div key={stat.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1 px-6">
              <span className={`text-3xl font-black ${stat.gold ? 'text-[#D4AF37]' : 'text-white'}`}>{stat.value}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">{stat.label}</span>
            </div>
            {i < arr.length - 1 && <span className="w-px h-8 bg-[#2a2a2a] hidden sm:block" />}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── How It Works Animated ─── */
function HowItWorksAnimated() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);

  const steps = [
    {
      label: 'Lead emails in',
      icon: '📧',
      time: '0–15s',
      headline: 'A new lead just landed',
      description: 'John found you on Google. He\'s interested. AKAI sees it immediately.',
      badge: { emoji: '✨', text: 'New lead detected' },
      ui: (
        <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 text-left space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1f1f1f]">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs">JS</div>
            <div>
              <p className="text-white text-xs font-semibold">john.smith@gmail.com</p>
              <p className="text-gray-500 text-[10px]">to: info@yourbusiness.com · just now</p>
            </div>
            <span className="ml-auto text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full">New</span>
          </div>
          <p className="text-white text-xs font-bold">Subject: Kitchen renovation enquiry</p>
          <p className="text-gray-400 text-xs leading-relaxed">Hi, I&apos;m interested in a custom kitchen for our new home. Budget around $8–12k. We&apos;re looking to start ASAP — ideally within 2 months. Can you send through some options?</p>
        </div>
      ),
    },
    {
      label: 'AKAI scores & responds',
      icon: '🧠',
      time: '15–30s',
      headline: 'AKAI reads, scores, and acts',
      description: 'In under 30 seconds, AKAI analyses intent, scores the lead, and starts drafting.',
      badge: { emoji: '🔥', text: 'High-intent lead' },
      ui: (
        <div className="space-y-3">
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#D4AF37] text-sm">🔥</span>
              <span className="text-white text-xs font-bold">Lead Score: 8/10</span>
              <span className="ml-auto text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-full">High priority</span>
            </div>
            <div className="space-y-1.5">
              {['✅ Budget mentioned ($8–12k)', '✅ Specific project (kitchen reno)', '✅ Urgent timeline (2 months)'].map(t => (
                <div key={t} className="flex items-center gap-2">
                  <span className="text-xs text-gray-300">{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1">{[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
            <span className="text-gray-400 text-xs">Generating personalised proposal...</span>
          </div>
        </div>
      ),
    },
    {
      label: 'Proposal sent',
      icon: '✉️',
      time: '30–45s',
      headline: 'Proposal out the door — in 23 seconds',
      description: 'A tailored, professional proposal — written and sent before you even knew the lead existed.',
      badge: { emoji: '✉️', text: 'Proposal sent in 23 seconds' },
      ui: (
        <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 text-left space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1f1f1f]">
            <div className="w-7 h-7 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center text-xs text-[#D4AF37] font-bold">AK</div>
            <div>
              <p className="text-white text-xs font-semibold">AKAI (on your behalf)</p>
              <p className="text-gray-500 text-[10px]">to: john.smith@gmail.com · 23s after enquiry</p>
            </div>
            <span className="ml-auto text-[10px] bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full">Sent ✓</span>
          </div>
          <p className="text-white text-xs font-bold">Re: Kitchen renovation enquiry</p>
          <p className="text-gray-400 text-xs leading-relaxed">Dear John, Thank you for reaching out about your kitchen renovation. Based on your brief, I&apos;ve put together three options in the $8–12k range with timelines that fit your 2-month window. I&apos;d love to walk you through them on a quick call — here&apos;s my booking link...</p>
        </div>
      ),
    },
    {
      label: 'Meeting booked',
      icon: '📅',
      time: '45–60s',
      headline: 'John booked. Thursday 10am.',
      description: 'No back-and-forth. John clicked the link, picked a time, it\'s in the calendar.',
      badge: { emoji: '📅', text: 'Meeting confirmed' },
      ui: (
        <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs uppercase tracking-wider">This week</span>
            <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Confirmed</span>
          </div>
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-3 flex items-center gap-3">
            <div className="text-center min-w-[40px]">
              <p className="text-[#D4AF37] text-lg font-black">THU</p>
              <p className="text-white text-xs font-bold">10:00</p>
            </div>
            <div className="w-px h-8 bg-[#D4AF37]/30" />
            <div>
              <p className="text-white text-xs font-bold">Kitchen Consultation — John Smith</p>
              <p className="text-gray-500 text-[10px]">30 min · Google Meet · Booked via AKAI</p>
            </div>
          </div>
          <p className="text-gray-500 text-[10px]">John confirmed via your booking link · No manual scheduling needed</p>
        </div>
      ),
    },
    {
      label: 'Follow-up sent',
      icon: '🔄',
      time: '60–75s',
      headline: 'No reply? AKAI follows up — automatically',
      description: 'After 48 hours with no response, AKAI sends a warm follow-up. And logs the pattern.',
      badge: { emoji: '🧠', text: 'Pattern logged' },
      ui: (
        <div className="space-y-3">
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-400 text-sm">⏰</span>
              <span className="text-white text-xs font-bold">48h follow-up triggered</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">&ldquo;Hi John, just wanted to make sure you received my proposal. Happy to hop on a quick call if you have questions — here&apos;s the link again...&rdquo;</p>
          </div>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#D4AF37] text-sm">🧠</span>
              <span className="text-[#D4AF37] text-xs font-bold">Intelligence update</span>
            </div>
            <p className="text-gray-400 text-xs">Pattern logged: Tuesday enquiries convert <span className="text-white font-semibold">2× better</span> — strategy updated automatically</p>
          </div>
        </div>
      ),
    },
    {
      label: 'You close the deal',
      icon: '🏆',
      time: '75–90s',
      headline: 'You close. $8,400. AKAI did the work.',
      description: 'You showed up to one call. Everything else was handled — automatically, professionally, relentlessly.',
      badge: { emoji: '💰', text: '$8,400 kitchen sale' },
      ui: (
        <div className="space-y-3">
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4 text-center">
            <p className="text-[#D4AF37] text-3xl font-black mb-1">$8,400</p>
            <p className="text-white text-xs font-bold">Kitchen renovation — John Smith</p>
            <p className="text-gray-500 text-[10px] mt-1">Deal closed · Revenue logged</p>
          </div>
          <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-4">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">AKAI handled:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {['4 emails written', '1 call attempted', '2 follow-ups sent', '1 meeting booked'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <span className="text-[#D4AF37] text-xs">✓</span>
                  <span className="text-gray-300 text-[10px]">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const start = () => { setStep(0); setPlaying(true); setDone(false); };
  const restart = () => { setStep(0); setPlaying(true); setDone(false); };

  useEffect(() => {
    if (!playing) return;
    if (step >= steps.length - 1) {
      setPlaying(false);
      setDone(true);
      return;
    }
    const t = setTimeout(() => setStep(s => s + 1), 2500);
    return () => clearTimeout(t);
  }, [playing, step, steps.length]);

  const current = steps[step] ?? steps[0]!;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <section className="relative py-24 px-6">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent" />
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest mb-3">See it live</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Lead in. Deal closed. <span className="text-[#D4AF37]">90 seconds.</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Watch AKAI turn a cold enquiry into a booked meeting and a closed sale — without you lifting a finger.
          </p>
        </div>

        {/* Main demo card */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #111 0%, #0d0d0d 100%)',
            border: '1px solid #2a2a2a',
            boxShadow: '0 0 80px rgba(212,175,55,0.06)',
          }}
        >
          {/* Top bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#1f1f1f] bg-[#0a0a0a]">
            <div className="flex gap-1.5">{['bg-red-500/60','bg-yellow-500/60','bg-green-500/60'].map(c => <div key={c} className={`w-2.5 h-2.5 rounded-full ${c}`} />)}</div>
            <span className="text-gray-600 text-xs mx-auto">AKAI · Live demo</span>
            {playing && <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full animate-pulse">● Live</span>}
          </div>

          {/* Step tabs */}
          <div className="flex overflow-x-auto border-b border-[#1f1f1f] bg-[#0a0a0a] px-2 py-1 gap-1">
            {steps.map((s, i) => (
              <button
                key={s.label}
                onClick={() => { setStep(i); setPlaying(false); setDone(i === steps.length - 1); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                  i === step
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                    : i < step
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                <span>{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="p-6 md:p-8">
            {!playing && !done && step === 0 ? (
              /* Pre-play state */
              <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
                <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-4xl">
                  ▶
                </div>
                <div>
                  <p className="text-white font-black text-xl mb-2">Watch the 90-second demo</p>
                  <p className="text-gray-500 text-sm max-w-sm">See how AKAI handles a real lead from first email to closed deal — automatically.</p>
                </div>
                <button
                  id="demo-play-btn"
                  onClick={start}
                  className="inline-flex items-center gap-2 bg-[#D4AF37] text-black font-bold rounded-xl px-8 py-3 text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20"
                >
                  ▶ Watch the 90-second demo
                </button>
              </div>
            ) : (
              /* Playing / navigating */
              <div className="grid md:grid-cols-2 gap-8 items-start">
                {/* Left: context */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{current.icon}</span>
                    <div>
                      <span className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-wider">{current.time}</span>
                      <p className="text-gray-500 text-xs">{current.label}</p>
                    </div>
                  </div>
                  <h3 className="text-white font-black text-2xl md:text-3xl leading-tight">{current.headline}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{current.description}</p>
                  <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full px-4 py-2">
                    <span className="text-sm">{current.badge.emoji}</span>
                    <span className="text-[#D4AF37] text-sm font-semibold">{current.badge.text}</span>
                  </div>
                  {done && (
                    <button
                      onClick={restart}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mt-2"
                    >
                      ↺ Restart demo
                    </button>
                  )}
                </div>

                {/* Right: UI mockup */}
                <div className="animate-fade-in">{current.ui}</div>
              </div>
            )}

            {/* Progress bar */}
            {(playing || done || step > 0) && (
              <div className="mt-8 space-y-2">
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>Step {step + 1} of {steps.length}</span>
                  <span>{current.time}</span>
                </div>
                <div className="h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#D4AF37] rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'bg-[#D4AF37]' : 'bg-[#2a2a2a]'}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── How AKAI Learns ─── */
function HowAKAILearns() {
  const steps = [
    {
      icon: '👁️',
      title: 'Watches',
      description: 'Every call, email, click, and reply is logged automatically. Nothing is missed.',
    },
    {
      icon: '🧠',
      title: 'Learns',
      description: 'Pattern engine finds what works: best send times, winning tones, optimal follow-up windows.',
    },
    {
      icon: '🚀',
      title: 'Improves',
      description: 'Proposals, calls, and timing automatically adapt. Results compound. Every day is better than the last.',
    },
  ];

  return (
    <section className="relative py-24 px-6">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent" />

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            The AI that actually <span className="text-[#D4AF37]">gets better</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            AKAI is built on one principle: relentless, continuous improvement. Every interaction is an input. Every result is a lesson. The mission never stops.
          </p>
        </div>

        {/* 3-step visual */}
        <div className="grid md:grid-cols-3 gap-4 relative">
          {/* Connector lines on desktop */}
          <div className="hidden md:block absolute top-12 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-gradient-to-r from-[#D4AF37]/30 via-[#D4AF37]/60 to-[#D4AF37]/30" />

          {steps.map((step, i) => (
            <div
              key={step.title}
              className="relative bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 text-center hover:border-[#D4AF37]/30 transition-colors duration-300"
            >
              {/* Step number */}
              <div className="absolute -top-3 left-6 bg-[#D4AF37] text-black text-xs font-black rounded-full w-6 h-6 flex items-center justify-center">
                {i + 1}
              </div>

              <div className="text-5xl mb-4">{step.icon}</div>
              <h3 className="text-white font-black text-2xl mb-3">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Agent Team ─── */
function AgentTeam() {
  const agents = [
    { icon: '📧', name: 'Email Guard', role: 'Inbox Manager', description: 'Reads every enquiry, writes the proposal, sends it — before you\'ve even seen the email.' },
    { icon: '📞', name: 'Sophie', role: 'Sales Voice Agent', description: 'Finds leads, writes the pitch, books the meeting. While you sleep.' },
    { icon: '📅', name: 'Calendar', role: 'Scheduling Agent', description: 'Your personal EA — minus the salary, small talk, and sick days.' },
    { icon: '👤', name: 'Recruit', role: 'Hiring Agent', description: 'Reads 500 CVs. Scores every one. Hands you the top 5. Done.' },
    { icon: '📢', name: 'Ads', role: 'Campaign Agent', description: 'Runs your Google Ads like a $150k/yr media buyer. At a fraction of the cost.' },
    { icon: '📱', name: 'Social', role: 'Content Agent', description: 'Posts to every platform, every day. Your brand never goes quiet again.' },
    { icon: '🧠', name: 'Pattern Engine', role: 'Intelligence Agent', description: 'Spots what\'s working, doubles down on it, and updates your strategy — automatically.' },
    { icon: '🤖', name: 'Follow-up Engine', role: 'Persistence Agent', description: 'The relentless closer. Follows up every lead until they reply or opt out.' },
    { icon: '🛡️', name: 'Code Shield', role: 'Quality Agent', description: 'Catches every failure, finds the root cause, and makes sure it never happens again.' },
    { icon: '📈', name: 'Optimizer', role: 'Copy Agent', description: 'Rewrites your proposals using what actually got replies. Gets better every send.' },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest mb-3">Your team</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            10 AI agents. <span className="text-[#D4AF37]">One goal.</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Relentless pursuit of excellence. Continuously improving. Making your business more profitable —
            all through a single prompt.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {agents.map(agent => (
            <div
              key={agent.name}
              className="group bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 hover:border-[#D4AF37]/40 hover:bg-[#111] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-3xl mb-3">{agent.icon}</div>
              <p className="text-white font-black text-sm mb-0.5">{agent.name}</p>
              <p className="text-[#D4AF37] text-[10px] font-semibold uppercase tracking-wider mb-2">{agent.role}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{agent.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-600 text-sm">
            All agents run <span className="text-white">24/7</span> ·{' '}
            Learn from every interaction ·{' '}
            Report to <span className="text-[#D4AF37]">you</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Intelligence Section ─── */
function IntelligenceSection() {
  const features = [
    {
      icon: '📊',
      title: 'Pattern Recognition',
      description: 'Finds what converts and doubles down on it',
    },
    {
      icon: '🤖',
      title: 'Autonomous Decisions',
      description: 'Follow-ups happen without you asking',
    },
    {
      icon: '🛡️',
      title: 'Self-Healing',
      description: 'Failures get root-caused and prevented automatically',
    },
    {
      icon: '📈',
      title: 'Adaptive Copy',
      description: 'Every proposal gets smarter with each reply',
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div
          className="rounded-3xl p-10 md:p-14"
          style={{
            background: 'linear-gradient(135deg, #111 0%, #0d0d0d 100%)',
            border: '1px solid #D4AF37',
            boxShadow: '0 0 60px rgba(212,175,55,0.08)',
          }}
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full px-4 py-1.5 text-sm text-[#D4AF37] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
              Intelligence layer
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
              The AI that learns <span className="text-[#D4AF37]">while you sleep</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Six modules. One brain. Every failure becomes a lesson. Every win becomes a pattern.
            </p>
          </div>

          {/* 2×2 feature grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map(feature => (
              <div
                key={feature.title}
                className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 flex gap-4 items-start hover:border-[#D4AF37]/30 transition-colors duration-300"
              >
                <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                <div>
                  <h3 className="text-white font-bold text-base mb-1">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Intelligence feed preview */}
          <div className="mt-8 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
              <span className="text-[#D4AF37] text-xs font-semibold uppercase tracking-wider">⚡ Real-time intelligence feed</span>
            </div>
            <div className="space-y-2">
              {[
                { time: 'Just now', event: '📧 Email Guard detected high-intent enquiry — proposal sent in 12 seconds' },
                { time: '4m ago', event: '🧠 Pattern: Tuesday 9am sends convert 3× better — schedule updated' },
                { time: '11m ago', event: '📞 Sophie called lead #47 — meeting booked, logged for analysis' },
                { time: '28m ago', event: '🛡️ Root cause detected for missed follow-up — prevention gate added' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="text-gray-600 text-xs whitespace-nowrap mt-0.5">{item.time}</span>
                  <span className="text-gray-400">{item.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing CTA ─── */
function PricingCTA({ onOpenCapture }: { onOpenCapture: () => void }) {
  return (
    <section className="py-24 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <div className="absolute left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#D4AF37]/[0.04] rounded-full blur-[80px] pointer-events-none" />
        <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest mb-4">
          Get started today
        </p>
        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
          Start free. No credit card.
          <br />
          <span className="text-white">AK<span className="text-[#D4AF37]">AI</span> gets smarter from day one.</span>
        </h2>
        <p className="text-gray-500 text-lg mb-8">
          Your first 14 days are free. Cancel any time. The AI keeps improving regardless.
        </p>
        <button
          onClick={onOpenCapture}
          aria-label="Create your free account"
          className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] text-black font-bold rounded-xl px-10 py-4 text-lg hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-[#D4AF37]/20"
        >
          Create your free account →
        </button>
        <p className="text-gray-600 text-sm mt-4">
          No credit card · No setup · No BS · Just results
        </p>
      </div>
    </section>
  );
}

/* ─── New Footer ─── */
function AKAIFooter() {
  return (
    <footer className="border-t border-[#1f1f1f] pt-12 pb-8 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Final CTA strip */}
        <div className="text-center mb-10">
          <p className="text-white/50 text-sm uppercase tracking-widest font-semibold mb-2">One last thing</p>
          <p className="text-2xl sm:text-3xl font-black text-white leading-tight mb-1">
            Your competitors are already automating.
          </p>
          <p className="text-2xl sm:text-3xl font-black text-[#D4AF37] leading-tight">
            Are you?
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm text-center sm:text-left">
            © 2026 AK<span className="text-[#D4AF37]">AI</span> · <a href="https://getakai.ai" className="text-[#D4AF37] hover:underline">getakai.ai</a> · Built in Sydney 🇦🇺 · 25 years of enterprise tech, distilled into one prompt.
          </p>
          <div className="flex gap-6">
            <a href="/login" className="text-gray-500 hover:text-white text-sm transition-colors">Sign in</a>
            <a href="/she-demo" className="text-gray-500 hover:text-white text-sm transition-colors">Live demo</a>
            <a href="/dashboard" className="text-gray-500 hover:text-white text-sm transition-colors">Dashboard</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main Page ─── */
export default function Home() {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [capturePlan, setCapturePlan] = useState<string | undefined>(undefined);
  const [demoOpen, setDemoOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const openCapture = (plan?: string) => {
    setCapturePlan(plan);
    setCaptureOpen(true);
  };

  // Persist referral code from ?ref= query param for later use on signup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem('akai_ref_code', ref);
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar onOpenCapture={() => openCapture()} onOpenChat={() => setChatOpen(true)} />
      <Hero onOpenCapture={() => openCapture()} onOpenDemo={() => setDemoOpen(true)} />
      <TrustBar />
      <div id="demo"><HowItWorksAnimated /></div>
      <HowAKAILearns />
      <AgentTeam />
      <Modules />
      <IntelligenceSection />
      <Pricing onOpenCapture={(plan) => openCapture(plan)} />
      <PricingCTA onOpenCapture={() => openCapture()} />
      <AKAIFooter />
      <HomepageChat defaultOpen={chatOpen} onOpenChange={setChatOpen} />
      <LeadCaptureModal isOpen={captureOpen} onClose={() => { setCaptureOpen(false); setCapturePlan(undefined); }} selectedPlan={capturePlan} />
      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
    </main>
  );
}
