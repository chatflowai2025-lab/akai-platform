'use client';

import { useState, useRef, useEffect } from 'react';

interface Msg { role: 'user' | 'assistant'; content: string; }

const ON_GROUP_CONTEXT = `You are AK, AKAI's AI business partner, speaking directly with Ron Stolikas — CEO of ON Group International and ON Group Cyber. ON Group has served every major Australian financial institution for 30+ years: NAB, CBA, ANZ, Westpac. They handle IT/banking hardware (Olivetti, Panini, Custom keyboards) and contract lifecycle management, cybersecurity, and compliance for enterprise clients. Their website ongrp.com currently scores 5/10 on our digital health audit — no live chat, no online booking, zero Google Maps presence. Your role is to show Ron exactly how AKAI handles inbound enquiries from banks, manages vendor contract renewals automatically, and ensures nothing operational ever lets down the trust he's spent 30 years building. Be specific, confident, and focused on outcomes — not features. Ron is experienced, sharp, and values directness.`;

const INITIAL: Msg = {
  role: 'assistant',
  content: "G'day Ron 👋\n\nI'm AK — AKAI's AI business partner. I've been briefed on ON Group.\n\nTell me: when a bank sends a contract renewal at 4:58pm on a Friday — what happens before Monday morning?",
};

const agents = [
  { icon: '📞', name: 'Sales Agent', role: 'Handles every inbound enquiry from financial institutions within 60 seconds. No missed opportunities.' },
  { icon: '📧', name: 'Email Guard', role: 'Reads, categorises and responds to all inbound email. Flags renewals, compliance dates, and key changes instantly.' },
  { icon: '📄', name: 'Proposals', role: 'Drafts professional proposals and responses automatically — ready to send with one click.' },
  { icon: '📅', name: 'Calendar', role: 'Manages scheduling across your team and client contacts. No phone tag, no double-bookings.' },
  { icon: '📊', name: 'Finance', role: 'Tracks vendor contracts, renewal dates, and payment cycles. Olivetti, Panini, Icertis — nothing slips.' },
  { icon: '🌐', name: 'Web Agent', role: 'Monitors your digital presence and captures leads from ongrp.com 24/7 — including after hours.' },
  { icon: '🎯', name: 'Ads Agent', role: 'Manages targeted outreach to financial institutions and government contacts.' },
  { icon: '👥', name: 'Recruit', role: 'Sources and screens specialist talent when you need to scale your lean team.' },
  { icon: '📣', name: 'Social', role: 'Maintains ON Group\'s professional presence — builds authority with financial sector content.' },
  { icon: '🔒', name: 'Compliance', role: 'Tracks every relevant email and document. Audit season becomes a one-click export, not a scramble.' },
];

const useCases = [
  {
    number: '01',
    title: 'Every enquiry handled in 60 seconds',
    detail: 'A bank submits an enquiry at 9pm Friday. AKAI reads it, categorises it, and sends a professional acknowledgement within 60 seconds — with your name on it. Monday morning, you have a full briefing ready.',
    stat: '< 60s',
    statLabel: 'Response time',
  },
  {
    number: '02',
    title: 'Bookings confirmed without back-and-forth',
    detail: 'Clients book meetings directly into your calendar. No phone tag, no email chains, no scheduling assistant needed. AKAI handles the coordination and sends the agenda.',
    stat: '0',
    statLabel: 'Scheduling calls needed',
  },
  {
    number: '03',
    title: 'Follow-ups sent until they say yes',
    detail: 'Every proposal, every vendor renewal, every outstanding item — AKAI tracks it and follows up automatically at the right cadence. Nothing falls through the cracks.',
    stat: '100%',
    statLabel: 'Follow-up coverage',
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
            { role: 'user' as const, content: ON_GROUP_CONTEXT },
            { role: 'assistant' as const, content: 'Understood. I\'m fully briefed on ON Group.' },
            ...newMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          ];

      const res = await fetch('/api/chat/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: '93wNExhIS1XEg1kidiZVOO7fsMv1',
          message: text,
          history,
          currentModule: 'on_group_demo',
        }),
      });

      let data: { message?: string } = {};
      try { data = await res.json(); } catch { /* non-json */ }
      setPrimed(true);
      setMessages(p => [...p, { role: 'assistant', content: data.message || "That's exactly the kind of situation AKAI was built for. Want me to walk you through the demo?" }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickReplies = [
    'What happens to a Friday evening bank enquiry?',
    'How does AKAI handle vendor renewals?',
    'Show me the compliance tracking',
  ];

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-[#2a2a2a]" style={{ height: '520px', background: '#111' }}>
      {/* Chat header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f1f]" style={{ background: '#0d0d0d' }}>
        <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-black text-sm">AK</div>
        <div>
          <p className="text-sm font-bold text-white">AK — Briefed on ON Group</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-500">Active now · Knows your business</span>
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
          placeholder="Ask AK anything about ON Group..."
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

export default function ONGroupDemoPage() {
  const [ctaClicked, setCtaClicked] = useState(false);

  return (
    <div className="min-h-screen font-sans" style={{ background: '#080808', color: '#fff' }}>
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-black" style={{ color: '#D4AF37', letterSpacing: '-0.03em' }}>AKAI</span>
            <span className="text-gray-600">×</span>
            <span className="text-white font-bold text-lg">ON Group</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-500">Live demo — built for Ron Stolikas</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <p className="text-xs uppercase tracking-widest font-semibold mb-6" style={{ color: '#D4AF37' }}>
          Prepared exclusively for ON Group International
        </p>
        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6" style={{ letterSpacing: '-0.04em' }}>
          What if your entire<br />
          <span style={{ color: '#D4AF37' }}>sales operation</span><br />
          ran itself?
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Every bank enquiry answered. Every vendor contract tracked. Every follow-up sent.
          All while you focus on what you do best — being in front of clients.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#demo"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-black font-bold text-base transition-opacity hover:opacity-90"
            style={{ background: '#D4AF37' }}
          >
            See AK in action →
          </a>
          <a
            href="mailto:mrakersten@gmail.com?subject=ON Group — AKAI Demo Follow Up"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base border border-[#2a2a2a] text-gray-300 hover:border-[#D4AF37] hover:text-white transition-all"
          >
            Talk to Aaron
          </a>
        </div>
      </section>

      {/* Digital Audit Callout */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-[#2a2a2a] p-8" style={{ background: '#0d0d0d' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="text-5xl font-black" style={{ color: '#D4AF37' }}>5<span className="text-2xl text-gray-600">/10</span></div>
              <div>
                <p className="text-white font-bold">ongrp.com Digital Health Score</p>
                <p className="text-gray-500 text-sm">Audited by AKAI · March 2026</p>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Live chat', status: false },
                { label: 'Online booking', status: false },
                { label: 'Google Maps', status: false },
                { label: 'Local SEO', status: false },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <span className={item.status ? 'text-green-400' : 'text-red-400'}>
                    {item.status ? '✓' : '✗'}
                  </span>
                  <span className="text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Potential lead uplift</p>
              <p className="text-2xl font-black" style={{ color: '#D4AF37' }}>+40%</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <p className="text-xs uppercase tracking-widest font-semibold mb-4 text-center" style={{ color: '#D4AF37' }}>What AKAI does for ON Group</p>
        <h2 className="text-3xl md:text-4xl font-black text-center mb-12" style={{ letterSpacing: '-0.03em' }}>
          Three things that change everything
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {useCases.map(uc => (
            <div key={uc.number} className="rounded-2xl p-7 border border-[#1f1f1f]" style={{ background: '#0d0d0d' }}>
              <p className="text-4xl font-black mb-4" style={{ color: '#D4AF37', opacity: 0.4 }}>{uc.number}</p>
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

      {/* Live Demo Section */}
      <section id="demo" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: '#D4AF37' }}>Live demo</p>
            <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ letterSpacing: '-0.03em' }}>
              AK already knows<br />ON Group
            </h2>
            <p className="text-gray-400 text-base leading-relaxed mb-6">
              Ask AK anything — how it handles a Friday night bank enquiry, what happens
              when Olivetti sends a renewal notice, or how your compliance audit prep works.
            </p>
            <div className="space-y-3">
              {[
                'Knows your two business units cold',
                'Understands financial institution clients',
                'Briefed on your vendor relationships',
                'Ready to show you Monday morning scenarios',
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

      {/* The Team */}
      <section className="border-t border-[#1a1a1a] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs uppercase tracking-widest font-semibold mb-4 text-center" style={{ color: '#D4AF37' }}>The AKAI team</p>
          <h2 className="text-3xl font-black text-center mb-3" style={{ letterSpacing: '-0.03em' }}>10 specialists. One monthly fee.</h2>
          <p className="text-gray-500 text-center text-base mb-12 max-w-xl mx-auto">
            Every agent is configured around ON Group — your clients, your workflows, your standards.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {agents.map(agent => (
              <div key={agent.name} className="rounded-xl p-5 border border-[#1f1f1f] text-center hover:border-[#D4AF37]/40 transition-colors" style={{ background: '#0d0d0d' }}>
                <div className="text-3xl mb-3">{agent.icon}</div>
                <p className="text-sm font-bold text-white mb-1">{agent.name}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{agent.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-[#D4AF37]/30 p-10 text-center" style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #111 100%)' }}>
          <p className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: '#D4AF37' }}>Investment</p>
          <h2 className="text-3xl font-black mb-3" style={{ letterSpacing: '-0.03em' }}>Less than half a day of admin staff</h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            Most businesses like ON Group start on Growth — covering Sales, Email Guard, and Proposals.
            Full ROI typically visible within the first week.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto mb-8">
            {[
              { name: 'Starter', price: '$49', period: '/mo', desc: 'Core AI team' },
              { name: 'Growth', price: '$149', period: '/mo', desc: 'Full platform', highlight: true },
              { name: 'Agency', price: '$399', period: '/mo', desc: 'Multi-client' },
            ].map(p => (
              <div key={p.name} className={`rounded-xl p-4 border ${p.highlight ? 'border-[#D4AF37]' : 'border-[#2a2a2a]'}`}>
                <p className="text-xs text-gray-500 mb-1">{p.name}</p>
                <p className={`text-xl font-black ${p.highlight ? 'text-[#D4AF37]' : 'text-white'}`}>{p.price}<span className="text-xs font-normal text-gray-500">{p.period}</span></p>
                <p className="text-xs text-gray-600 mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mb-2">14-day free trial. No card required.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-4xl font-black mb-4" style={{ letterSpacing: '-0.03em' }}>
          Ready to see it in your inbox?
        </h2>
        <p className="text-gray-400 mb-10 text-lg">
          Aaron will walk you through a live demo using ON Group&apos;s own website and a sample bank enquiry.
        </p>
        <a
          href="mailto:mrakersten@gmail.com?subject=ON Group — Book a call with Aaron&body=Hi Aaron,%0D%0A%0D%0AI'd like to explore AKAI for ON Group.%0D%0A%0D%0A"
          onClick={() => setCtaClicked(true)}
          className="inline-flex items-center gap-3 px-10 py-5 rounded-xl text-black font-bold text-lg transition-all hover:opacity-90 shadow-2xl"
          style={{ background: '#D4AF37', boxShadow: '0 0 40px rgba(212,175,55,0.25)' }}
        >
          Book a call with Aaron →
        </a>
        {ctaClicked && (
          <p className="text-sm text-gray-500 mt-4">Your email client should open. Or reach Aaron directly: mrakersten@gmail.com</p>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-6 px-6 text-center">
        <p className="text-xs text-gray-700">
          Built exclusively for{' '}
          <span className="text-gray-500 font-semibold">ON Group</span>
          {' '}·{' '}
          <span style={{ color: '#D4AF37' }} className="font-bold">AKAI</span>
          {' '}· getakai.ai
        </p>
      </footer>
    </div>
  );
}
