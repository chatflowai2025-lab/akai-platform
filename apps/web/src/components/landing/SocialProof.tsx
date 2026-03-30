'use client';

import { useEffect, useState } from 'react';

// Auto-scrolling industry ticker
const INDUSTRIES = [
  '🏗️ Trades & Construction', '🏠 Real Estate', '💰 Finance & Mortgage',
  '🎯 Recruitment', '🛥️ Luxury & Lifestyle', '🏥 Health & Medical',
  '⚖️ Legal Services', '🍽️ Hospitality', '🛒 Retail & eCommerce',
  '🏋️ Fitness & Wellness', '🎨 Creative Agencies', '🏢 Professional Services',
];

function IndustryTicker() {
  // Duplicate for seamless loop
  const items = [...INDUSTRIES, ...INDUSTRIES];
  return (
    <div className="overflow-hidden relative w-full">
      <div className="flex gap-6 animate-ticker whitespace-nowrap">
        {items.map((item, i) => (
          <span key={i} className="text-sm text-white/40 font-medium flex-shrink-0 px-1">{item}</span>
        ))}
      </div>
    </div>
  );
}

// Auto-rotating testimonials carousel
const TESTIMONIALS = [
  {
    quote: 'Set up the Sales agent on a Tuesday. By Thursday Sophie had already booked 3 kitchen consultations worth $24k combined. I genuinely wasn\'t expecting it to work that fast.',
    name: 'Michael T.',
    company: 'Luxury Kitchen Co.',
    location: 'Sydney',
    initials: 'MT',
    tag: 'Early Access',
  },
  {
    quote: 'I was sceptical about AI calling mortgage leads — but Sophie handled objections better than my junior staff. 8 qualified meetings booked in 48 hours, while I was asleep.',
    name: 'Sarah L.',
    company: 'Mortgage Broker',
    location: 'Melbourne',
    initials: 'SL',
    tag: 'Early Access',
  },
  {
    quote: 'The Web agent flagged a missing CTA on our jobs page — we\'d had it wrong for 2 years. Fixed it that afternoon. Applications up 31% the following week.',
    name: 'James K.',
    company: 'Recruitment Agency',
    location: 'Brisbane',
    initials: 'JK',
    tag: 'Early Access',
  },
];

export default function SocialProof() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      setFading(true);
      fadeTimeout = setTimeout(() => {
        setActiveIdx(i => (i + 1) % TESTIMONIALS.length);
        setFading(false);
      }, 400);
    }, 5000);
    return () => {
      clearInterval(interval);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, []);

  const active = TESTIMONIALS[activeIdx]!;

  return (
    <section className="relative py-20 px-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <div className="max-w-5xl mx-auto space-y-16">

        {/* Auto-scrolling industry ticker */}
        <div className="text-center">
          <p className="text-xs text-white/20 uppercase tracking-widest font-semibold mb-6">Trusted by Australian businesses across every industry</p>
          <IndustryTicker />
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.06]">
          <div className="bg-[#0a0a0a] px-6 py-5 text-center">
            <p className="text-3xl font-black text-[#D4AF37]">10</p>
            <p className="text-xs text-white/40 mt-1.5 leading-snug">AI agents working 24/7</p>
          </div>
          <div className="bg-[#0a0a0a] px-6 py-5 text-center">
            <p className="text-3xl font-black text-[#D4AF37]">&lt; 60s</p>
            <p className="text-xs text-white/40 mt-1.5 leading-snug">to first call</p>
          </div>
          <div className="bg-[#0a0a0a] px-6 py-5 text-center">
            <p className="text-xl font-black text-[#D4AF37] leading-tight mt-1">AU-first</p>
            <p className="text-xs text-white/40 mt-1.5 leading-snug">Built for Australian SMBs</p>
          </div>
          <div className="bg-[#0a0a0a] px-6 py-5 text-center">
            <p className="text-xl font-black text-white leading-tight mt-1">Zero</p>
            <p className="text-xs text-white/40 mt-1.5 leading-snug">hiring. No training. No waiting.</p>
          </div>
        </div>

        {/* Testimonials carousel */}
        <div>
          <div className="flex items-center justify-center gap-3 mb-8">
            <p className="text-center text-xs text-white/20 uppercase tracking-widest font-semibold">Early Access Feedback</p>
            <span className="text-[10px] bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Beta</span>
          </div>

          {/* Active testimonial — fades between */}
          <div className="max-w-2xl mx-auto">
            <div
              className="glass rounded-2xl p-8 flex flex-col gap-5 transition-opacity duration-400"
              style={{ opacity: fading ? 0 : 1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} className="w-4 h-4 text-[#D4AF37]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                {active.tag && (
                  <span className="text-[10px] text-white/20 border border-white/10 px-2 py-0.5 rounded-full">{active.tag}</span>
                )}
              </div>
              <p className="text-white/80 text-base leading-relaxed">&ldquo;{active.quote}&rdquo;</p>
              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                <div className="w-9 h-9 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] text-xs font-black flex-shrink-0">
                  {active.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{active.name}</p>
                  <p className="text-xs text-white/30">{active.company} · {active.location}</p>
                </div>
              </div>
            </div>

            {/* Dot nav */}
            <div className="flex justify-center gap-2 mt-6">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setFading(true); setTimeout(() => { setActiveIdx(i); setFading(false); }, 400); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIdx ? 'bg-[#D4AF37] w-6' : 'bg-white/20 w-1.5 hover:bg-white/40'}`}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
