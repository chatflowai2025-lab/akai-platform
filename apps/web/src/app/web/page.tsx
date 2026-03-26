'use client';

import Button from '@/components/ui/Button';

const STEPS = [
  {
    number: '01',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    title: 'Describe',
    description: 'Tell AKAI about your business in plain English — your industry, what you sell, and who you sell to.',
    accent: 'from-[#F59E0B]/20 to-transparent',
  },
  {
    number: '02',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    title: 'Generate',
    description: 'AI designs and builds your full website — copy, layout, SEO, lead forms — in under 2 minutes.',
    accent: 'from-[#D4AF37]/20 to-transparent',
  },
  {
    number: '03',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'Publish',
    description: 'Go live instantly. Update anything, anytime — just chat. No developers. No waiting.',
    accent: 'from-[#F59E0B]/20 to-transparent',
  },
];

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    title: 'SEO Optimised',
    description: 'Schema markup, meta tags, page speed, and structured data — all baked in automatically.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .98h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
      </svg>
    ),
    title: 'Lead Capture Built-in',
    description: 'Forms, CTAs, and booking widgets pre-configured and connected to your AKAI pipeline.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    title: 'Update via Chat',
    description: 'Change pricing, swap images, add a new page — just describe it. AKAI handles the rest.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    ),
    title: 'Mobile-First',
    description: 'Designed for phones first. Looks flawless on every screen — from iPhone to 4K monitor.',
  },
];

export default function WebPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-[#1f1f1f] sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md">
        <a href="/" className="flex items-center">
          <span className="text-xl font-black tracking-tight">AK<span className="text-[#F59E0B]">AI</span></span>
        </a>
        <span className="text-white/20 mx-1">/</span>
        <span className="text-sm text-white/50">Web</span>
        <div className="ml-auto">
          <Button href="/onboard" size="sm" className="glow-gold-sm">
            Build My Website →
          </Button>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-6 pt-16 pb-16 overflow-hidden dot-grid">
        {/* Glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#D4AF37]/[0.05] rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-[#F59E0B]/[0.06] rounded-full blur-[80px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-[#D4AF37]/[0.04] rounded-full blur-[60px]" />
        </div>

        {/* Badge */}
        <div className="fade-up fade-up-1 inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-[#F59E0B] mb-8">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Coming soon</span>
          <span className="w-px h-3 bg-white/10" />
          <span className="text-white/50">AKAI Web Module</span>
        </div>

        {/* Headline */}
        <h1 className="fade-up fade-up-2 text-5xl md:text-7xl font-black mb-6 leading-[0.95] tracking-tight max-w-4xl">
          Your website,{' '}
          <span className="gradient-text">built by AI.</span>
          <br />
          Updated by chat.
        </h1>

        {/* Sub */}
        <p className="fade-up fade-up-3 text-xl text-white/40 max-w-2xl mb-10 leading-relaxed">
          Describe your business in plain English. AKAI builds a professional,
          SEO-optimised website with lead capture in{' '}
          <span className="text-white">under 2 minutes.</span>
        </p>

        {/* CTA row */}
        <div className="fade-up fade-up-4 flex flex-col sm:flex-row gap-4 items-center mb-16">
          <Button href="/onboard" size="lg" className="glow-gold-sm min-w-[240px]">
            Build My Website →
          </Button>
          <Button href="#how-it-works" variant="ghost" size="lg">
            See how it works
          </Button>
        </div>

        {/* Stats */}
        <div className="fade-up fade-up-4 w-full max-w-2xl">
          <div className="glass rounded-2xl px-8 py-5 grid grid-cols-3 divide-x divide-white/[0.06]">
            <div className="flex flex-col items-center gap-1 px-4">
              <span className="text-3xl font-black text-white tracking-tight">&lt; 2m</span>
              <span className="text-xs text-white/40 uppercase tracking-wider">Build Time</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-4">
              <span className="text-3xl font-black gradient-text tracking-tight">100%</span>
              <span className="text-xs text-white/40 uppercase tracking-wider">AI Generated</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-4">
              <span className="text-3xl font-black text-white tracking-tight">$0</span>
              <span className="text-xs text-white/40 uppercase tracking-wider">Dev Cost</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
              Three steps to{' '}
              <span className="gradient-text">a live website</span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              No developers. No agencies. No waiting weeks.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="relative glass card-hover rounded-2xl p-8 overflow-hidden group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${step.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mb-5">
                    {step.icon}
                  </div>
                  <div className="text-[11px] font-black text-[#D4AF37]/50 tracking-[0.2em] uppercase mb-3">
                    Step {step.number}
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-white">{step.title}</h3>
                  <p className="text-white/40 leading-relaxed text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
              Everything your website{' '}
              <span className="gradient-text">needs to convert</span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Not just a pretty page — a lead machine that works while you sleep.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="relative glass card-hover rounded-2xl p-6 flex gap-5 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center flex-shrink-0 relative">
                  {feature.icon}
                </div>
                <div className="relative">
                  <h3 className="font-bold text-base mb-1.5 text-white">{feature.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#D4AF37]/[0.05] rounded-full blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-[#F59E0B] mb-8">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Join the waitlist — launching soon</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-[0.95]">
            Ready to ditch your{' '}
            <span className="gradient-text">web agency?</span>
          </h2>
          <p className="text-white/40 text-lg mb-10 leading-relaxed">
            Get early access to AKAI Web. Be the first to launch a site built entirely by AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Button href="/onboard" size="lg" className="glow-gold min-w-[240px]">
              Build My Website →
            </Button>
            <Button href="/" variant="ghost" size="lg">
              ← Back to AKAI
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1f1f1f] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-black text-xs">
              A
            </div>
            <span className="text-sm text-white/40">AKAI Web — part of the AKAI platform</span>
          </div>
          <a href="/" className="text-sm text-white/30 hover:text-[#D4AF37] transition-colors">
            getakai.ai
          </a>
        </div>
      </footer>
    </main>
  );
}
