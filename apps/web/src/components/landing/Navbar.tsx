'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37] flex items-center justify-center">
            <span className="text-black font-black text-[9px] tracking-tight">AK</span>
          </div>
          <span className="text-xl font-black tracking-tight">
            AK<span className="text-[#F59E0B]">AI</span>
          </span>
        </a>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8 text-sm text-white/40">
          <a href="#how-it-works" className="hover:text-white transition-colors duration-200">How It Works</a>
          <a href="#modules" className="hover:text-white transition-colors duration-200">Modules</a>
          <a href="#pricing" className="hover:text-white transition-colors duration-200">Pricing</a>
        </div>

        {/* CTA */}
        <Button href="/onboard" size="sm">
          Get Started →
        </Button>
      </div>
    </nav>
  );
}
