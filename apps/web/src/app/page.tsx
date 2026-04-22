'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Navbar from '@/components/landing/Navbar';
import { DemoModal } from '@/components/landing/Hero';
import { gtag, initScrollDepthTracking } from '@/hooks/useGA4Track';

const Modules = dynamic(() => import('@/components/landing/Modules'), { ssr: false });
const Pricing = dynamic(() => import('@/components/landing/Pricing'), { ssr: false });
const LeadCaptureModal = dynamic(() => import('@/components/LeadCaptureModal'), { ssr: false });

interface Msg { role: 'user' | 'assistant'; content: string; }

const INITIAL: Msg = {
  role: 'assistant',
  content: "Hey! I'm AK. What kind of business do you run?",
};

function HomepageChat({ defaultOpen = false, onOpenChange }: { defaultOpen?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Msg[]>([INITIAL]);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);
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

/* ─── Metrics Trust Bar ─── */
function TrustBar() {
  return (
    <div className="w-full bg-[#0d0d0d] border-y border-[#1f1f1f] py-4 overflow-hidden">
      <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-2 px-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-[#D4AF37]">10,000+</span>
          <span className="text-sm text-gray-500">leads captured</span>
        </div>
        <span className="text-[#D4AF37]/30 hidden sm:block">·</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-[#D4AF37]">500+</span>
          <span className="text-sm text-gray-500">AI calls made</span>
        </div>
        <span className="text-[#D4AF37]/30 hidden sm:block">·</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-[#D4AF37]">98%</span>
          <span className="text-sm text-gray-500">uptime</span>
        </div>
        <span className="text-[#D4AF37]/30 hidden sm:block">·</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 uppercase tracking-wider">Powered by</span>
          <span className="text-sm font-bold text-white/60 border border-white/10 rounded px-2 py-0.5">Claude AI</span>
          <span className="text-sm font-bold text-white/60 border border-white/10 rounded px-2 py-0.5">Firebase</span>
          <span className="text-sm font-bold text-white/60 border border-white/10 rounded px-2 py-0.5">Stripe</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard Mockup ─── */
function DashboardMockup() {
  return (
    <div className="w-full max-w-2xl mx-auto mt-12 rounded-2xl overflow-hidden border border-[#2a2a2a] shadow-2xl shadow-black/60">
      {/* Window chrome */}
      <div className="bg-[#0d0d0d] border-b border-[#1f1f1f] px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-[11px] text-gray-600 font-mono">dashboard.getakai.ai</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      </div>
      {/* Dashboard body */}
      <div className="bg-[#111] p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-black text-sm">AKAI Dashboard</p>
            <p className="text-gray-500 text-[10px]">All agents running · Last updated: just now</p>
          </div>
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-[10px] font-semibold">9 Active</span>
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Leads Today', value: '14', gold: true },
            { label: 'Meetings Booked', value: '3', gold: false },
            { label: 'Calls Made', value: '28', gold: false },
            { label: 'Revenue Pipeline', value: '$42k', gold: true },
          ].map(s => (
            <div key={s.label} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-3 text-center">
              <p className={`text-xl font-black ${s.gold ? 'text-[#D4AF37]' : 'text-white'}`}>{s.value}</p>
              <p className="text-[9px] text-gray-600 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
        {/* Agent activity feed */}
        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            Live Agent Activity
          </p>
          <div className="space-y-2">
            {[
              { time: 'Just now', event: '📧 Email Guard — Proposal sent to Marco V. (Kitchen Reno $9k)', dot: 'bg-[#D4AF37]' },
              { time: '4m ago',   event: '📞 Voice — Sophie called James T., meeting booked Thu 10am',    dot: 'bg-green-400' },
              { time: '12m ago',  event: '📱 Social — 3 posts scheduled across LinkedIn & Instagram',      dot: 'bg-blue-400' },
              { time: '31m ago',  event: '👤 Recruit — 12 candidates screened, shortlist of 3 ready',     dot: 'bg-purple-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-[11px]">
                <span className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${item.dot}`} />
                <span className="text-gray-500 whitespace-nowrap">{item.time}</span>
                <span className="text-gray-300">{item.event}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Hero Section ─── */
const HERO_HEADLINES = [
  {
    line1: 'Your entire business.',
    line2: 'One prompt.',
    sub: 'Describe what you do. AKAI builds your AI executive team — sales, email, voice, recruiting, ads, proposals — and runs it 24/7.',
  },
  {
    line1: 'Your AI Executive Team.',
    line2: 'Running 24/7.',
    sub: 'Sales. Marketing. Recruiting. Finance. All automated. All learning. All working while you don\'t.',
  },
  {
    line1: 'Stop losing leads',
    line2: 'after hours.',
    sub: 'Every enquiry answered. Every follow-up sent. Every meeting booked — automatically, while you sleep.',
  },
  {
    line1: '10 AI agents.',
    line2: '$199/month.',
    sub: 'Replace your back office, not your team. Sales agent, voice agent, email guard, recruiter, ads manager and more — all running today.',
  },
  {
    line1: 'Once manual.',
    line2: 'Always automated.',
    sub: 'Every task you do twice becomes a task AKAI does forever. Describe your business and watch it work.',
  },
];

function HeroSection({ onOpenCapture, onOpenDemo: _onOpenDemo }: { onOpenCapture: () => void; onOpenDemo: () => void }) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setHeroIdx(i => (i + 1) % HERO_HEADLINES.length);
        setFading(false);
      }, 400);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const hero = HERO_HEADLINES[heroIdx]!;

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="hero-glow-1 absolute rounded-full"
          style={{
            width: '900px',
            height: '900px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, rgba(212,175,55,0.03) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="hero-glow-2 absolute rounded-full"
          style={{
            width: '500px',
            height: '500px',
            top: '30%',
            left: '25%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '400px',
            height: '400px',
            bottom: '20%',
            right: '15%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'heroGlow2 12s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Live pill */}
      <div className="fade-up fade-up-1 inline-flex items-center gap-2 bg-[#111] border border-[#2a2a2a] rounded-full px-4 py-1.5 text-sm text-[#D4AF37] mb-8">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span>Now live</span>
        <span className="w-px h-3 bg-[#2a2a2a]" />
        <span className="text-gray-500">AI business automation from Sydney to New York</span>
      </div>

      {/* Headline — rotating */}
      <div className="fade-up fade-up-2 max-w-5xl w-full" style={{ transition: 'opacity 0.4s', opacity: fading ? 0 : 1 }}>
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-4 leading-[0.9] tracking-tight">
          <span className="text-white block">{hero.line1}</span>
          <span className="text-[#D4AF37] block">{hero.line2}</span>
        </h1>
      </div>

      {/* Sub — rotating */}
      <p className="fade-up fade-up-3 text-lg sm:text-xl text-gray-400 max-w-2xl mb-4 leading-relaxed" style={{ transition: 'opacity 0.4s', opacity: fading ? 0 : 1 }}>
        <span className="text-white font-semibold">{hero.sub}</span>
      </p>

      {/* Headline dots indicator */}
      <div className="flex gap-1.5 mb-4">
        {HERO_HEADLINES.map((_, i) => (
          <button key={i} onClick={() => { setFading(true); setTimeout(() => { setHeroIdx(i); setFading(false); }, 400); }}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === heroIdx ? 'bg-[#D4AF37] w-4' : 'bg-white/20'}`}
          />
        ))}
      </div>

      {/* CTAs */}
      <div className="fade-up fade-up-4 flex flex-col items-center gap-4 mb-6 w-full max-w-sm sm:max-w-none">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
          <button
            onClick={onOpenCapture}
            aria-label="Start free trial"
            className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] text-black font-bold rounded-xl px-8 py-4 text-base hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/25 w-full sm:min-w-[200px] sm:w-auto"
          >
            Start Free Trial →
          </button>
          <button
            onClick={() => { gtag('cta_clicked', { button: 'Get a Demo Call', page: 'homepage' }); _onOpenDemo(); }}
            className="inline-flex items-center justify-center gap-2 bg-transparent border border-[#2a2a2a] text-white font-semibold rounded-xl px-8 py-4 text-base hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition-all w-full sm:min-w-[200px] sm:w-auto"
          >
            📞 Get a Demo Call
          </button>
          <button
            onClick={() => { gtag('cta_clicked', { button: 'Free Health Report', page: 'homepage' }); onOpenCapture(); }}
            className="inline-flex items-center justify-center gap-2 bg-transparent border border-[#D4AF37]/30 text-[#D4AF37] font-semibold rounded-xl px-8 py-4 text-base hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/5 transition-all w-full sm:min-w-[200px] sm:w-auto"
          >
            📊 Free Health Report
          </button>
        </div>
        <p className="text-xs text-gray-500">Trusted by Australian SMBs · No credit card required</p>
      </div>

      {/* Dashboard Mockup */}
      <div className="fade-up fade-up-4 w-full max-w-3xl">
        <DashboardMockup />
      </div>
    </section>
  );
}

/* ─── How It Works — 3 Steps ─── */
function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: '💬',
      title: 'Describe your business',
      time: '30 seconds',
      description: 'Tell AKAI your industry, who you sell to, and what you want to automate. Plain English. No setup required.',
    },
    {
      number: '02',
      icon: '⚡',
      title: 'AKAI builds your team',
      time: 'Instant',
      description: 'Your AI executives spin up immediately — Sales, Email, Calendar, Social, Recruiter — all configured and ready.',
    },
    {
      number: '03',
      icon: '🚀',
      title: 'Watch it work',
      time: '24/7',
      description: 'Leads get followed up. Meetings get booked. Content gets posted. You get a report every morning. It never stops.',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 px-6">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent" />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Up and running in <span className="text-[#D4AF37]">minutes.</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            No developers. No agencies. No waiting.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connector */}
          <div className="hidden md:block absolute top-14 left-[calc(33.33%+2rem)] right-[calc(33.33%+2rem)] h-px bg-gradient-to-r from-[#D4AF37]/20 via-[#D4AF37]/50 to-[#D4AF37]/20" />

          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 text-center hover:border-[#D4AF37]/30 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Step badge */}
              <div className="absolute -top-3 left-6 bg-[#D4AF37] text-black text-xs font-black rounded-full w-6 h-6 flex items-center justify-center">
                {i + 1}
              </div>

              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-3xl">
                {step.icon}
              </div>

              <div className="inline-flex items-center gap-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full px-3 py-1 mb-3">
                <span className="text-[#D4AF37] text-xs font-bold">{step.time}</span>
              </div>

              <h3 className="text-white font-black text-xl mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function TestimonialsSection() {
  const testimonials = [
    {
      quote: 'We booked 12 meetings in the first week. I didn\'t make a single call.',
      name: 'Marco V.',
      role: 'Kitchen Studio Owner',
      initials: 'MV',
    },
    {
      quote: 'The AI recruiter screened 47 candidates and gave me a shortlist of 6. Took 20 minutes.',
      name: 'Sarah K.',
      role: 'Operations Manager',
      initials: 'SK',
    },
    {
      quote: 'Our Google Ads ROAS went from 1.8x to 4.2x in 3 weeks.',
      name: 'James T.',
      role: 'E-commerce Director',
      initials: 'JT',
    },
  ];

  return (
    <section className="relative py-24 px-6">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent" />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest mb-3">Results</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Real businesses. <span className="text-[#D4AF37]">Real results.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="relative bg-[#111] border border-[#1f1f1f] rounded-2xl p-7 hover:border-[#D4AF37]/20 transition-all duration-300 hover:-translate-y-1"
              style={{ borderLeft: '3px solid #D4AF37' }}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[1,2,3,4,5].map(s => (
                  <svg key={s} className="w-4 h-4 text-[#D4AF37]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-white/85 text-base leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>

              <div className="flex items-center gap-3 pt-4 border-t border-[#1f1f1f]">
                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] text-xs font-black flex-shrink-0">
                  {t.initials}
                </div>
                <div>
                  <p className="text-white text-sm font-bold">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How AKAI Learns (Intelligence) ─── */
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
            Intelligence
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            The AI that actually <span className="text-[#D4AF37]">gets better</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            AKAI is built on one principle: relentless, continuous improvement. Every interaction is an input. Every result is a lesson.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 relative">
          <div className="hidden md:block absolute top-12 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-gradient-to-r from-[#D4AF37]/30 via-[#D4AF37]/60 to-[#D4AF37]/30" />

          {steps.map((step, i) => (
            <div
              key={step.title}
              className="relative bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 text-center hover:border-[#D4AF37]/30 transition-colors duration-300"
            >
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

/* ─── How It Works Animated Demo ─── */
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
      label: 'Deal closed',
      icon: '🏆',
      time: '60–90s',
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
    <section id="demo" className="relative py-24 px-6">
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

        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #111 0%, #0d0d0d 100%)',
            border: '1px solid #2a2a2a',
            boxShadow: '0 0 80px rgba(212,175,55,0.06)',
          }}
        >
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#1f1f1f] bg-[#0a0a0a]">
            <div className="flex gap-1.5">{['bg-red-500/60','bg-yellow-500/60','bg-green-500/60'].map(c => <div key={c} className={`w-2.5 h-2.5 rounded-full ${c}`} />)}</div>
            <span className="text-gray-600 text-xs mx-auto">AKAI · Live demo</span>
            {playing && <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full animate-pulse">● Live</span>}
          </div>

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

          <div className="p-6 md:p-8">
            {!playing && !done && step === 0 ? (
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
              <div className="grid md:grid-cols-2 gap-8 items-start">
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
                <div>{current.ui}</div>
              </div>
            )}

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

/* ─── Intelligence Section ─── */
function IntelligenceSection() {
  const features = [
    { icon: '📊', title: 'Pattern Recognition', description: 'Finds what converts and doubles down on it' },
    { icon: '🤖', title: 'Autonomous Decisions', description: 'Follow-ups happen without you asking' },
    { icon: '🛡️', title: 'Self-Healing', description: 'Failures get root-caused and prevented automatically' },
    { icon: '📈', title: 'Adaptive Copy', description: 'Every proposal gets smarter with each reply' },
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
              Four modules. One brain. Every failure becomes a lesson. Every win becomes a pattern.
            </p>
          </div>

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

/* ─── Final CTA ─── */
function FinalCTA({ onOpenCapture }: { onOpenCapture: () => void }) {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute rounded-full"
          style={{
            width: '800px',
            height: '400px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>
      <div className="max-w-3xl mx-auto text-center relative">
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
          Your competitors are<br />
          <span className="text-[#D4AF37]">already using AI.</span>
        </h2>
        <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
          The question is whether you&apos;re ahead of them or behind.
        </p>
        <button
          onClick={onOpenCapture}
          aria-label="Start your free trial"
          className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] text-black font-black rounded-xl px-12 py-5 text-xl hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-[#D4AF37]/25"
        >
          Start Your Free Trial →
        </button>
        <p className="text-gray-600 text-sm mt-5">No credit card · No setup · Cancel any time</p>
      </div>
    </section>
  );
}

/* ─── Digital Health Report CTA ─── */
function HealthReportCTA({ onOpenCapture }: { onOpenCapture: () => void }) {
  return (
    <section className="relative py-24 px-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute rounded-full"
          style={{
            width: '600px',
            height: '600px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(ellipse, rgba(212,175,55,0.05) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>
      <div className="max-w-4xl mx-auto relative">
        <div
          className="rounded-3xl p-10 md:p-14 text-center"
          style={{
            background: 'linear-gradient(135deg, #141008 0%, #0f0d07 50%, #0d0d0d 100%)',
            border: '1px solid #D4AF37',
            boxShadow: '0 0 80px rgba(212,175,55,0.18), 0 0 160px rgba(212,175,55,0.08), inset 0 0 60px rgba(212,175,55,0.04)',
          }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-4 py-1.5 text-sm text-[#D4AF37] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            Free · No credit card · Instant results
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Get Your Free{' '}
            <span className="text-[#D4AF37]">Digital Health Report</span>
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            See exactly where your business is losing customers online. AI-audits your website, Google presence, and social in 60 seconds.
          </p>

          {/* Audit highlights */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10 text-left">
            {[
              { icon: '🌐', title: 'Website Audit', desc: 'Speed, SEO, mobile, trust signals — scored and ranked' },
              { icon: '📍', title: 'Google Presence', desc: 'How you appear in local search vs your competitors' },
              { icon: '📱', title: 'Social Footprint', desc: 'Content gaps, engagement rate, missed opportunities' },
            ].map(item => (
              <div key={item.title} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl p-5">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-white font-bold text-sm mb-1">{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <button
            onClick={onOpenCapture}
            aria-label="Get your free digital health report"
            className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] text-black font-black rounded-xl px-10 py-4 text-lg hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#D4AF37]/20"
          >
            Get My Free Report →
          </button>
          <p className="text-gray-600 text-sm mt-4">Sign in to get your personalised report · Takes 60 seconds</p>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function AKAIFooter() {
  return (
    <footer className="border-t border-[#1f1f1f] pt-12 pb-8 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-12">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-black tracking-tight">AK<span className="text-[#D4AF37]">AI</span></span>
            </Link>
            <p className="text-white/30 text-xs">Your AI Executive Team</p>
            <a href="mailto:hello@getakai.ai" className="text-white/20 text-xs hover:text-white/50 transition-colors mt-1">hello@getakai.ai</a>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-8 text-sm">
            <div className="flex flex-col gap-3">
              <p className="text-white/20 text-xs uppercase tracking-widest font-semibold">Product</p>
              <a href="#how-it-works" className="text-white/40 hover:text-white transition-colors">How It Works</a>
              <a href="#modules" className="text-white/40 hover:text-white transition-colors">Skills</a>
              <a href="#pricing" onClick={() => gtag('cta_clicked', { button: 'See Pricing', page: 'homepage' })} className="text-white/40 hover:text-white transition-colors">Pricing</a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-white/20 text-xs uppercase tracking-widest font-semibold">Legal</p>
              <a href="/privacy" className="text-white/40 hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="text-white/40 hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/20">
          <p>© 2026 AKAI. All rights reserved. · <a href="https://getakai.ai" className="hover:text-white/50 transition-colors">getakai.ai</a> · Made in Sydney 🇦🇺</p>
          <div className="flex items-center gap-4">
            <a href="https://x.com/getakai_ai" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white transition-colors flex items-center gap-1.5">
              {/* X (Twitter) icon */}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.259 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
              </svg>
              @getakai_ai
            </a>
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
    gtag('cta_clicked', { button: 'Start Free Trial', plan: plan ?? 'default', page: 'homepage' });
  };

  // ── GA4: page view + scroll depth ─────────────────────────────────────
  useEffect(() => {
    gtag('page_view', { page: 'homepage' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cleanup = initScrollDepthTracking();
    return cleanup ?? undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem('akai_ref_code', ref);
  }, []);

  const handleOpenDemo = () => {
    gtag('demo_modal_opened', { page: 'homepage' });
    setDemoOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
      <Navbar onOpenCapture={() => openCapture()} onOpenChat={() => setChatOpen(true)} />
      <HeroSection onOpenCapture={() => openCapture()} onOpenDemo={handleOpenDemo} />
      <TrustBar />
      <HowItWorksSection />
      <div id="modules"><Modules /></div>
      <TestimonialsSection />
      <HowItWorksAnimated />
      <HowAKAILearns />
      <IntelligenceSection />
      <HealthReportCTA onOpenCapture={() => openCapture()} />
      <div id="pricing"><Pricing onOpenCapture={(plan) => openCapture(plan)} /></div>
      <FinalCTA onOpenCapture={() => openCapture()} />
      <AKAIFooter />
      <HomepageChat defaultOpen={chatOpen} onOpenChange={setChatOpen} />
      <LeadCaptureModal isOpen={captureOpen} onClose={() => { setCaptureOpen(false); setCapturePlan(undefined); }} selectedPlan={capturePlan} />
      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
    </main>
  );
}
