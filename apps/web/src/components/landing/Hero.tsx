import Button from '@/components/ui/Button';

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.07)_0%,_transparent_70%)] pointer-events-none" />

      {/* Live badge */}
      <div className="inline-flex items-center gap-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-full px-4 py-1.5 text-sm text-[#F59E0B] mb-8">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Now live · AI-powered business automation
      </div>

      {/* Headline */}
      <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight tracking-tight">
        Your AI<br />
        <span className="text-[#F59E0B]">Business Partner</span>
      </h1>

      {/* Subheadline */}
      <p className="text-xl text-gray-400 max-w-2xl mb-4 leading-relaxed">
        Sales. Recruitment. Web. Ads. Social.{' '}
        <span className="text-white font-medium">One AI platform that runs your business</span>{' '}
        while you focus on what matters.
      </p>

      <p className="text-lg text-gray-500 mb-10">
        Describe your business. We&apos;ll build it, run it, and grow it.
      </p>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Button href="mailto:hello@getakai.ai?subject=Start%20Free%20Trial" size="lg">
          Start Free Trial →
        </Button>
        <Button href="#how-it-works" variant="ghost" size="lg">
          See How It Works
        </Button>
      </div>

      {/* Social proof */}
      <div className="mt-20 flex items-center gap-8 text-sm text-gray-500">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-white">5</span>
          <span>AI Modules</span>
        </div>
        <div className="w-px h-10 bg-[#1f1f1f]" />
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-white">24/7</span>
          <span>Always Running</span>
        </div>
        <div className="w-px h-10 bg-[#1f1f1f]" />
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-white">$297</span>
          <span>Starts at /mo</span>
        </div>
      </div>
    </section>
  );
}
