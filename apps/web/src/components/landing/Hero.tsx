'use client';

import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function Hero() {
  const { user, loading } = useAuth();
  const ctaHref = !loading && user ? '/dashboard' : '/login';

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 overflow-hidden dot-grid">

      {/* Multi-layer background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#F59E0B]/[0.04] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-[#D4AF37]/[0.06] rounded-full blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#F59E0B]/[0.04] rounded-full blur-[60px]" />
      </div>

      {/* Live badge */}
      <div className="fade-up fade-up-1 inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-[#F59E0B] mb-8">
        <span className="w-2 h-2 rounded-full bg-green-400 pulse-ring" />
        <span>Now live</span>
        <span className="w-px h-3 bg-white/10" />
        <span className="text-white/50">AI-powered business automation</span>
      </div>

      {/* Headline */}
      <h1 className="fade-up fade-up-2 text-6xl md:text-8xl font-black mb-6 leading-[0.95] tracking-tight max-w-4xl">
        Your AI
        <br />
        <span className="gradient-text">Business Partner</span>
      </h1>

      {/* Sub */}
      <p className="fade-up fade-up-3 text-xl text-white/40 max-w-xl mb-3 leading-relaxed">
        Sales · Recruit · Web · Ads · Social
      </p>
      <p className="fade-up fade-up-3 text-lg text-white/60 max-w-2xl mb-10 leading-relaxed">
        Describe your business. AKAI builds it, runs it, and grows it —
        <span className="text-white"> while you close deals.</span>
      </p>

      {/* CTA row */}
      <div className="fade-up fade-up-4 flex flex-col sm:flex-row gap-4 items-center mb-20">
        <Button href={ctaHref} size="lg" className="glow-gold-sm min-w-[220px]">
          Start Free Trial →
        </Button>
        <Button href="#how-it-works" variant="ghost" size="lg">
          See how it works
        </Button>
      </div>

      {/* Stats bar */}
      <div className="fade-up fade-up-4 w-full max-w-2xl">
        <div className="glass rounded-2xl px-8 py-5 grid grid-cols-3 divide-x divide-white/[0.06]">
          <div className="flex flex-col items-center gap-1 px-4">
            <span className="text-3xl font-black text-white tracking-tight">5</span>
            <span className="text-xs text-white/40 uppercase tracking-wider">AI Modules</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-4">
            <span className="text-3xl font-black text-white tracking-tight">24/7</span>
            <span className="text-xs text-white/40 uppercase tracking-wider">Always On</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-4">
            <span className="text-3xl font-black gradient-text tracking-tight">$297</span>
            <span className="text-xs text-white/40 uppercase tracking-wider">From /mo</span>
          </div>
        </div>
      </div>

    </section>
  );
}
