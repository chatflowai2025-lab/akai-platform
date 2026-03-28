'use client';

import { useState, useRef, useEffect } from 'react';

interface Msg { role: 'user' | 'assistant'; content: string; }

const LILY_CONTEXT = `You are AK, AKAI's AI business partner, speaking with Henrik Mortensen — the father of Lily Mortensen, a Sydney-based emerging contemporary painter. Lily creates abstract, process-led work with layered materials. She has a gallery showing coming up. Her website is lilymortensen.com and she's on Instagram @lily_is_cololinthepool. AKAI has already identified 22 collector contacts and prepared 2 gallery invitation templates including a submission to Saint Cloche (info@saintcloche.com). Your role is to show Henrik how AKAI can systematically grow Lily's art career — reaching gallery contacts automatically, following up on every collector enquiry, and building her social presence with AI-generated content. Be warm, specific, and focused on what matters to a parent watching their daughter build a creative career. Speak about concrete outcomes — gallery submissions sent, collectors followed up, Instagram content posted consistently.`;

const INITIAL: Msg = {
  role: 'assistant',
  content: "Hi Henrik! 👋 I'm AK.\n\nI've been looking at Lily's work — the abstract, layered process pieces. Really distinctive voice.\n\nI have 22 collector contacts and 2 gallery submissions ready to go for her. Want to see what that looks like?",
};

const useCases = [
  {
    icon: '🎨',
    number: '01',
    title: 'Reaches gallery contacts automatically',
    detail: 'AKAI identifies the right galleries, crafts personalised submission emails in Lily\'s voice, and manages the outreach — including follow-ups. Saint Cloche is first on the list.',
    stat: '22',
    statLabel: 'Collector contacts identified',
  },
  {
    icon: '💌',
    number: '02',
    title: 'Follows up on every collector enquiry',
    detail: 'When a collector enquires about a piece and goes quiet, AKAI follows up at the right moment — with the right message. No sale lost because someone forgot to reply.',
    stat: '100%',
    statLabel: 'Enquiry follow-up rate',
  },
  {
    icon: '📸',
    number: '03',
    title: 'Builds her social presence consistently',
    detail: 'AKAI generates Instagram content around Lily\'s process, upcoming shows, and new pieces — posted consistently so her audience grows even when she\'s in the studio.',
    stat: '3×',
    statLabel: 'More consistent posting',
  },
];

function AKChat() {
  const [messages, setMessages] = useState<Msg[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [primed, setPrimed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput('');

    const newMessages: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const history = primed
        ? newMessages.slice(-8).map(m => ({ role: m.role, content: m.content }))
        : [
            { role: 'user' as const, content: LILY_CONTEXT },
            { role: 'assistant' as const, content: 'Understood. I\'m fully briefed on Lily Mortensen and her art career.' },
            ...newMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          ];

      const res = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: '93wNExhIS1XEg1kidiZVOO7fsMv1',
          message: text,
          history,
          currentModule: 'lily_demo',
        }),
      });

      let data: { message?: string } = {};
      try { data = await res.json(); } catch { /* non-json */ }
      setPrimed(true);
      setMessages(p => [...p, { role: 'assistant', content: data.message || "That's exactly the kind of thing AKAI handles. Want me to show you the gallery outreach flow?" }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickReplies = [
    'Show me the gallery outreach',
    'How do collector follow-ups work?',
    'What content can you create for Lily?',
  ];

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-[#2a2a2a]" style={{ height: '520px', background: '#111' }}>
      {/* Chat header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f1f]" style={{ background: '#0d0d0d' }}>
        <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-black text-sm">AK</div>
        <div>
          <p className="text-sm font-bold text-white">AK — Briefed on Lily Mortensen</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-500">Active now · 22 contacts ready</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-[#D4AF37] text-black font-medium rounded-br-sm'
                : 'bg-[#1a1a1a] text-white/90 rounded-bl-sm border border-[#2a2a2a]'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">{[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {quickReplies.map(q => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a2a] text-gray-400 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-[#1f1f1f] flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask AK about Lily's career strategy..."
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition"
        >
          →
        </button>
      </div>
    </div>
  );
}

export default function LilyDemoPage() {
  return (
    <div className="min-h-screen font-sans" style={{ background: '#080808', color: '#fff' }}>
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-black" style={{ color: '#D4AF37', letterSpacing: '-0.03em' }}>AKAI</span>
            <span className="text-gray-600">×</span>
            <span className="text-white font-bold text-lg">Lily Mortensen</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-500">Prepared for Henrik Mortensen</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <p className="text-xs uppercase tracking-widest font-semibold mb-6" style={{ color: '#D4AF37' }}>
          For Henrik · lilymortensen.com · @lily_is_cololinthepool
        </p>
        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6" style={{ letterSpacing: '-0.04em' }}>
          Your daughter&apos;s art career,<br />
          <span style={{ color: '#D4AF37' }}>running on autopilot</span>
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Lily creates the work. AKAI handles the outreach, the follow-ups, and the social presence
          — so her career builds while she paints.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#demo"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-black font-bold text-base transition-opacity hover:opacity-90"
            style={{ background: '#D4AF37' }}
          >
            See what we&apos;ve already built →
          </a>
          <a
            href="mailto:mrakersten@gmail.com?subject=Lily Mortensen — AKAI Discussion&body=Hi Aaron,%0D%0A%0D%0AI'd like to discuss AKAI for Lily's art career.%0D%0A%0D%0A"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base border border-[#2a2a2a] text-gray-300 hover:border-[#D4AF37] hover:text-white transition-all"
          >
            Let&apos;s talk →
          </a>
        </div>
      </section>

      {/* Already done callout */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-[#D4AF37]/30 p-8" style={{ background: '#0d0d0d' }}>
          <p className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: '#D4AF37' }}>What AKAI has already prepared for Lily</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '🏛️', label: '22 collector contacts identified', sub: 'Sydney art market, curated by AKAI' },
              { icon: '📨', label: '2 gallery invitation templates', sub: 'Saint Cloche submission ready to go' },
              { icon: '🌐', label: '10 website improvement recommendations', sub: 'lilymortensen.com audit complete' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{item.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <p className="text-xs uppercase tracking-widest font-semibold mb-4 text-center" style={{ color: '#D4AF37' }}>What AKAI does for Lily</p>
        <h2 className="text-3xl md:text-4xl font-black text-center mb-12" style={{ letterSpacing: '-0.03em' }}>
          The career engine, running 24/7
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {useCases.map(uc => (
            <div key={uc.number} className="rounded-2xl p-7 border border-[#1f1f1f]" style={{ background: '#0d0d0d' }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{uc.icon}</span>
                <p className="text-2xl font-black" style={{ color: '#D4AF37', opacity: 0.4 }}>{uc.number}</p>
              </div>
              <h3 className="text-lg font-bold text-white mb-3">{uc.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">{uc.detail}</p>
              <div className="border-t border-[#1f1f1f] pt-4">
                <p className="text-3xl font-black" style={{ color: '#D4AF37' }}>{uc.stat}</p>
                <p className="text-xs text-gray-600 mt-1">{uc.statLabel}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Demo */}
      <section id="demo" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: '#D4AF37' }}>Live demo</p>
            <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ letterSpacing: '-0.03em' }}>
              AK already knows<br />Lily&apos;s work
            </h2>
            <p className="text-gray-400 text-base leading-relaxed mb-6">
              Ask AK anything — how the gallery outreach works, what happens when a collector goes
              quiet, or what an Instagram caption for Lily&apos;s next piece looks like.
            </p>
            <div className="space-y-3">
              {[
                'Knows Lily\'s style and current gallery targets',
                '22 collector contacts ready to activate',
                'Saint Cloche submission template drafted',
                'Instagram content strategy in place',
              ].map(point => (
                <div key={point} className="flex items-center gap-3 text-sm">
                  <span style={{ color: '#D4AF37' }}>✓</span>
                  <span className="text-gray-300">{point}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <AKChat />
          </div>
        </div>
      </section>

      {/* What Lily gets */}
      <section className="border-t border-[#1a1a1a] py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: '#D4AF37' }}>The full picture</p>
          <h2 className="text-3xl font-black mb-10" style={{ letterSpacing: '-0.03em' }}>
            Everything Lily needs. Nothing she has to manage.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '📬', label: 'Gallery outreach' },
              { icon: '🔁', label: 'Collector follow-ups' },
              { icon: '📸', label: 'Instagram content' },
              { icon: '🌐', label: 'Website optimisation' },
              { icon: '📊', label: 'Sales pipeline' },
              { icon: '📧', label: 'Email management' },
              { icon: '🎭', label: 'Show promotions' },
              { icon: '📈', label: 'Career analytics' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-4 border border-[#1f1f1f] text-center" style={{ background: '#0d0d0d' }}>
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-xs text-gray-400 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl font-black mb-4" style={{ letterSpacing: '-0.03em' }}>
          Let&apos;s get Lily&apos;s career<br />moving
        </h2>
        <p className="text-gray-400 mb-10 text-lg max-w-xl mx-auto">
          Aaron will walk you through exactly what AKAI has prepared — and what happens
          the moment Lily&apos;s first outreach goes out.
        </p>
        <a
          href="mailto:mrakersten@gmail.com?subject=Lily Mortensen — AKAI Discussion&body=Hi Aaron,%0D%0A%0D%0AI'd like to discuss AKAI for Lily.%0D%0A%0D%0A"
          className="inline-flex items-center gap-3 px-10 py-5 rounded-xl text-black font-bold text-lg transition-all hover:opacity-90 shadow-2xl"
          style={{ background: '#D4AF37', boxShadow: '0 0 40px rgba(212,175,55,0.25)' }}
        >
          Let&apos;s talk →
        </a>
        <p className="text-xs text-gray-600 mt-4">mrakersten@gmail.com · or reply to Aaron directly</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-6 px-6 text-center">
        <p className="text-xs text-gray-700">
          Built for{' '}
          <span className="text-gray-500 font-semibold">Lily Mortensen</span>
          {' '}·{' '}
          <span style={{ color: '#D4AF37' }} className="font-bold">AKAI</span>
          {' '}· getakai.ai
        </p>
      </footer>
    </div>
  );
}
