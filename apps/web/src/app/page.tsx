'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import Modules from '@/components/landing/Modules';
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
function Hero({ onOpenCapture }: { onOpenCapture: () => void }) {
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
        <span className="text-gray-500">AI business automation · Sydney</span>
      </div>

      {/* Headline */}
      <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-6 leading-[0.9] tracking-tight max-w-5xl">
        <span className="text-white">AK<span className="text-[#D4AF37]">AI</span> — Your AI Business Partner</span>
        <br />
        <span className="text-[#D4AF37]">That Gets Smarter Every Day</span>
      </h1>

      {/* Sub */}
      <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
        A team of 10 AI agents with one mission — automate your business through a prompt.{' '}
        <span className="text-white font-semibold">You focus on growing.</span> They handle everything else. 24/7, relentlessly improving and delivering every day.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 items-center mb-16">
        <button
          onClick={onOpenCapture}
          aria-label="Start free trial"
          className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] text-black font-bold rounded-xl px-8 py-4 text-base hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20 min-w-[180px]"
        >
          Start free →
        </button>
        <Link
          href="/she-demo"
          className="inline-flex items-center justify-center gap-2 bg-[#111] border border-[#2a2a2a] text-white font-semibold rounded-xl px-8 py-4 text-base hover:border-[#D4AF37]/40 hover:bg-[#1a1a1a] transition-all min-w-[180px]"
        >
          Watch it work →
        </Link>
      </div>

      {/* Stats bar */}
      <div className="w-full max-w-3xl bg-[#111] border border-[#1f1f1f] rounded-2xl px-8 py-5 grid grid-cols-2 md:grid-cols-4 divide-x divide-[#1f1f1f]">
        <div className="flex flex-col items-center gap-1 px-4">
          <span className="text-3xl font-black text-white">6</span>
          <span className="text-xs text-gray-500 uppercase tracking-wider">AI Modules</span>
        </div>
        <div className="flex flex-col items-center gap-1 px-4">
          <span className="text-3xl font-black text-white">24/7</span>
          <span className="text-xs text-gray-500 uppercase tracking-wider">Always On</span>
        </div>
        <div className="flex flex-col items-center gap-1 px-4">
          <span className="text-3xl font-black text-[#D4AF37]">&lt;60s</span>
          <span className="text-xs text-gray-500 uppercase tracking-wider">First Response</span>
        </div>
        <div className="flex flex-col items-center gap-1 px-4">
          <span className="text-3xl font-black text-[#D4AF37]">∞</span>
          <span className="text-xs text-gray-500 uppercase tracking-wider">Learns Daily</span>
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
    { icon: '📧', name: 'Email Guard', role: 'Inbox Manager', description: 'Reads every enquiry. Writes the proposal. Sends it. Never misses one.' },
    { icon: '📞', name: 'Sophie', role: 'Sales Voice Agent', description: 'Calls your leads in 60 seconds. Qualifies. Books. Repeats all day.' },
    { icon: '📅', name: 'Calendar', role: 'Scheduling Agent', description: 'Syncs your availability. Books meetings. No back-and-forth.' },
    { icon: '👤', name: 'Recruit', role: 'Hiring Agent', description: 'Screens every candidate. Scores them 0-100. Shortlists the best.' },
    { icon: '📢', name: 'Ads', role: 'Campaign Agent', description: 'Writes, launches and tracks Google Ads. No agency needed.' },
    { icon: '📱', name: 'Social', role: 'Content Agent', description: 'Creates content for every platform. Schedules it. Posts it.' },
    { icon: '🧠', name: 'Pattern Engine', role: 'Intelligence Agent', description: 'Learns what converts. Adapts your strategy. Gets sharper daily.' },
    { icon: '🤖', name: 'Follow-up Engine', role: 'Persistence Agent', description: 'Decides who needs a follow-up. How. When. Does it.' },
    { icon: '🛡️', name: 'Code Shield', role: 'Quality Agent', description: 'Every failure root-caused. Prevention gate added. Never repeats.' },
    { icon: '📈', name: 'Optimizer', role: 'Copy Agent', description: 'Rewrites your proposals based on what actually got replies.' },
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
          <span className="text-[#D4AF37]">AKAI gets smarter from day one.</span>
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
    <footer className="border-t border-[#1f1f1f] py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-gray-600 text-sm text-center sm:text-left">
          © 2026 AKAI · <a href="https://getakai.ai" className="text-[#D4AF37] hover:underline">getakai.ai</a> · Built in Sydney 🇦🇺 · AI that works while you don&apos;t
        </p>
        <div className="flex gap-6">
          <a href="/login" className="text-gray-500 hover:text-white text-sm transition-colors">Sign in</a>
          <a href="/she-demo" className="text-gray-500 hover:text-white text-sm transition-colors">Live demo</a>
          <a href="/dashboard" className="text-gray-500 hover:text-white text-sm transition-colors">Dashboard</a>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main Page ─── */
export default function Home() {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar onOpenCapture={() => setCaptureOpen(true)} onOpenChat={() => setChatOpen(true)} />
      <Hero onOpenCapture={() => setCaptureOpen(true)} />
      <TrustBar />
      <HowAKAILearns />
      <AgentTeam />
      <Modules />
      <IntelligenceSection />
      <PricingCTA onOpenCapture={() => setCaptureOpen(true)} />
      <AKAIFooter />
      <HomepageChat defaultOpen={chatOpen} onOpenChange={setChatOpen} />
      <LeadCaptureModal isOpen={captureOpen} onClose={() => setCaptureOpen(false)} />
    </main>
  );
}
