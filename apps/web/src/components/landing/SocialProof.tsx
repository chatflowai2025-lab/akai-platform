'use client';

// STATS reserved for future social-proof metrics section

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
  return (
    <section className="relative py-20 px-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <div className="max-w-5xl mx-auto space-y-16">

        {/* Trust banner */}
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm text-white/40 font-medium">
          <span>✅ Trusted by businesses across Sydney</span>
          <span className="hidden sm:inline text-white/10">·</span>
          <span>⚡ 24/7 AI operations</span>
          <span className="hidden sm:inline text-white/10">·</span>
          <span>🚀 Zero setup required</span>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.06]">
          <div className="bg-[#0a0a0a] px-6 py-5 text-center">
            <p className="text-3xl font-black text-[#D4AF37]">9</p>
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

        {/* Testimonials */}
        <div>
          <div className="flex items-center justify-center gap-3 mb-8">
            <p className="text-center text-xs text-white/20 uppercase tracking-widest font-semibold">
              Early Access Feedback
            </p>
            <span className="text-[10px] bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Beta</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map(t => (
              <div
                key={t.name}
                className="glass rounded-2xl p-6 flex flex-col gap-4 card-hover"
              >
                {/* Stars */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} className="w-3.5 h-3.5 text-[#D4AF37]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  {t.tag && (
                    <span className="text-[10px] text-white/20 border border-white/10 px-2 py-0.5 rounded-full">{t.tag}</span>
                  )}
                </div>

                {/* Quote */}
                <p className="text-white/80 text-sm leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-1 border-t border-white/[0.06]">
                  <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] text-xs font-black flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/30">{t.company} · {t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
