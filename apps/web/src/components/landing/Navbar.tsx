'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';


export default function Navbar({ onOpenCapture, onOpenChat }: { onOpenCapture?: () => void; onOpenChat?: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight">AK<span className="text-[#D4AF37]">AI</span></span>
          </a>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-8 text-sm text-white/40">
            <a href="#how-it-works" onClick={e => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors duration-200 cursor-pointer">How It Works</a>
            <a href="#modules" onClick={e => { e.preventDefault(); document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors duration-200 cursor-pointer">Skills</a>
            <a href="#pricing" onClick={e => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors duration-200 cursor-pointer">Pricing</a>
          </div>

          {/* CTA — desktop */}
          <div className="hidden md:flex items-center gap-3">
            
            {!loading && !user && (
              <>
                <a href="/login" className="text-sm text-white/60 hover:text-white transition-colors duration-200">
                  Sign In
                </a>
                <button
                  onClick={() => onOpenChat?.()}
                  className="text-sm font-semibold text-white/70 hover:text-[#D4AF37] transition-colors duration-200 flex items-center gap-1.5"
                >
                  💬 Talk to AK
                </button>
                <Button href="/login" size="sm">
                  Get Started →
                </Button>
              </>
            )}
            {!loading && user && (
              <Button href="/dashboard" size="sm">
                Dashboard →
              </Button>
            )}
            {loading && (
              <Button href="/login" size="sm">
                Get Started →
              </Button>
            )}
          </div>

          {/* Mobile: CTA + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {!loading && user ? (
              <Button href="/dashboard" size="sm">Dashboard →</Button>
            ) : (
              <Button onClick={() => onOpenCapture?.()} size="sm">Get Started →</Button>
            )}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="p-2 text-white/60 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06] px-6 py-4 flex flex-col gap-4">
            <a href="#how-it-works" onClick={e => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm text-white/60 hover:text-white transition-colors cursor-pointer">How It Works</a>
            <a href="#modules" onClick={e => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm text-white/60 hover:text-white transition-colors cursor-pointer">Skills</a>
            <a href="#pricing" onClick={e => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm text-white/60 hover:text-white transition-colors cursor-pointer">Pricing</a>
            {!loading && !user && (
              <>
                <a href="/login" className="text-sm text-white/60 hover:text-white transition-colors">Sign In</a>
                <button onClick={() => { onOpenChat?.(); setMobileMenuOpen(false); }} className="text-left text-sm font-semibold text-white/70 hover:text-[#D4AF37] transition-colors">
                  💬 Talk to AK
                </button>
              </>
            )}
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span>Theme</span>
              
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
