'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function Navbar({ onOpenCapture, onOpenChat }: { onOpenCapture?: () => void; onOpenChat?: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useAuth();

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
        <a href="/" className="flex items-center">
          <span className="text-xl font-black tracking-tight">AK<span className="text-[#F59E0B]">AI</span></span>
        </a>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8 text-sm text-white/40">
          <a href="#how-it-works" className="hover:text-white transition-colors duration-200">How It Works</a>
          <a href="#modules" className="hover:text-white transition-colors duration-200">Skills</a>
          <a href="#pricing" className="hover:text-white transition-colors duration-200">Pricing</a>
        </div>

        {/* CTA — logged-out visitors get capture modal, logged-in users go to dashboard */}
        <div className="flex items-center gap-3">
          {!loading && !user && (
            <>
              <a href="/login" className="text-sm text-white/60 hover:text-white transition-colors duration-200 hidden md:block">
                Sign In
              </a>
              <button
                onClick={() => onOpenChat?.()}
                className="text-sm font-semibold text-white/70 hover:text-[#D4AF37] transition-colors duration-200 hidden md:flex items-center gap-1.5"
              >
                💬 Talk to AK
              </button>
              <Button onClick={() => onOpenCapture?.()} size="sm">
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
            <Button onClick={() => onOpenCapture?.()} size="sm">
              Get Started →
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
