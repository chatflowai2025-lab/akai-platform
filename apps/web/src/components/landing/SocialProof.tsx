'use client';

const STATS = [
  { value: '9', label: 'AI agents working 24/7' },
  { value: '< 60s', label: 'to first call' },
  { value: 'AU-first', label: 'Built for Australian SMBs' },
  { value: '0', label: 'hiring. No training. No waiting.' },
];

const TESTIMONIALS = [
  {
    quote: 'AKAI found us 12 qualified leads in the first week.',
    name: 'Michael T.',
    company: 'Plumbing business',
    location: 'Sydney',
    initials: 'MT',
  },
  {
    quote: 'Sophie called 50 leads while I slept. 8 booked meetings by morning.',
    name: 'Sarah L.',
    company: 'Mortgage broker',
    location: 'Melbourne',
    initials: 'SL',
  },
  {
    quote: "The web audit found 3 gaps we'd missed for 2 years.",
    name: 'James K.',
    company: 'Recruitment agency',
    location: 'Brisbane',
    initials: 'JK',
  },
];

export default function SocialProof() {
  return (
    <section className="relative py-20 px-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

      <div className="max-w-5xl mx-auto space-y-16">

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
          <p className="text-center text-xs text-white/20 uppercase tracking-widest mb-8 font-semibold">
            What our customers say
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map(t => (
              <div
                key={t.name}
                className="glass rounded-2xl p-6 flex flex-col gap-4 card-hover"
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} className="w-3.5 h-3.5 text-[#D4AF37]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
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
