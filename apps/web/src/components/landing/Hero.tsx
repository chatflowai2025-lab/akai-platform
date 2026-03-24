import Button from '@/components/ui/Button';

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,175,55,0.06)_0%,_transparent_70%)] pointer-events-none" />

      {/* Live badge */}
      <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full px-4 py-1.5 text-sm text-[#D4AF37] mb-8">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Now live · 400+ businesses running on AKAI
      </div>

      {/* Headline */}
      <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight tracking-tight">
        Your AI<br />
        <span className="text-[#D4AF37]">Business Partner</span>
      </h1>

      {/* Subheadline */}
      <p className="text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
        Describe your business in plain English. AKAI builds your website, finds your customers,
        and runs your sales machine. <span className="text-white font-medium">Automatically.</span>
      </p>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Button href="/onboard" size="lg">
          Start Building — It's Free →
        </Button>
        <Button href="#how-it-works" variant="ghost" size="lg">
          See how it works
        </Button>
      </div>

      {/* Social proof */}
      <div className="mt-16 flex items-center gap-8 text-sm text-gray-500">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-white">400+</span>
          <span>Businesses</span>
        </div>
        <div className="w-px h-10 bg-[#1f1f1f]" />
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-white">12,000+</span>
          <span>Calls Made</span>
        </div>
        <div className="w-px h-10 bg-[#1f1f1f]" />
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-white">$4.2M</span>
          <span>Pipeline Generated</span>
        </div>
      </div>
    </section>
  );
}
