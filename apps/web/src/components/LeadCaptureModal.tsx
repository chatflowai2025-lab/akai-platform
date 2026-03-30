'use client';

import { useState } from 'react';
import { gtag } from '@/hooks/useGA4Track';

const FOCUS_OPTIONS = [
  'Sales calls',
  'Email management',
  'Recruiting',
  'Social media',
  'All of it',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan?: string;
}

export default function LeadCaptureModal({ isOpen, onClose, selectedPlan }: Props) {
  const [form, setForm] = useState({
    email: '',
    name: '',
    businessName: '',
    website: '',
    focus: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleClose = () => {
    setForm({ email: '', name: '', businessName: '', website: '', focus: '' });
    setStatus('idle');
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.name) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/trial-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          businessName: form.businessName,
          website: form.website ? (form.website.match(/^https?:\/\//) ? form.website : `https://${form.website}`) : undefined,
          focus: form.focus || 'Not specified',
          source: 'hero_cta',
          plan: selectedPlan || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');

      // GA4 conversion event
      gtag('lead_captured', { method: 'hero_cta', focus: form.focus || 'not_selected' });

      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-[#111] border border-[#2a2a2a] rounded-2xl p-7 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white text-xl leading-none transition-colors"
          aria-label="Close"
        >
          ×
        </button>

        {status === 'done' ? (
          /* ── Step 2: Success ── */
          <div className="py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-3">
              Welcome to AKAI! 🚀
            </h2>
            <p className="text-white/70 text-base leading-relaxed mb-2">
              You&apos;re in. Check your inbox — your free digital health report is on its way.
            </p>
            <p className="text-[#D4AF37] font-semibold text-sm mb-5">
              Aaron, the human behind AKAI, will be in touch personally.
            </p>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-5">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-3">What&apos;s coming your way</p>
              <ul className="text-sm text-white/70 text-left space-y-2.5">
                <li className="flex items-start gap-2"><span className="text-[#D4AF37]">✓</span> Free digital health report for your website</li>
                <li className="flex items-start gap-2"><span className="text-[#D4AF37]">✓</span> A personal note from Aaron, founder of AKAI</li>
                <li className="flex items-start gap-2"><span className="text-[#D4AF37]">✓</span> Your AI team setup, tailored to your business</li>
              </ul>
            </div>
            <p className="text-xs text-white/30">
              Joining hundreds of AU businesses already automating with AKAI
            </p>
          </div>
        ) : (
          /* ── Step 1: Form ── */
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white mb-1">
                {selectedPlan ? `Get ${selectedPlan} Early Access` : 'Get Early Access →'}
              </h2>
              <div className="h-0.5 w-12 rounded-full bg-[#D4AF37] mb-3" />
              <p className="text-white/40 text-sm leading-relaxed">
                Tell us what to automate. Aaron will reach out personally within 24 hours.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Email Address *</label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="you@business.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* First Name */}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">First Name *</label>
                <input
                  required
                  type="text"
                  autoComplete="given-name"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Jane"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* Business Name (optional) */}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Business Name <span className="text-white/20">(optional)</span></label>
                <input
                  type="text"
                  autoComplete="organization"
                  value={form.businessName}
                  onChange={e => set('businessName', e.target.value)}
                  placeholder="Your company name"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* Website URL — for free health report */}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Website URL <span className="text-[#D4AF37]/70 text-xs">(get a free health report)</span></label>
                <input
                  type="text"
                  autoComplete="url"
                  value={form.website}
                  onChange={e => set('website', e.target.value)}
                  placeholder="yourbusiness.com.au"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* Focus dropdown */}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">What do you want to automate? *</label>
                <select
                  required
                  value={form.focus}
                  onChange={e => set('focus', e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors text-sm appearance-none"
                >
                  <option value="">Select what matters most…</option>
                  {FOCUS_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {status === 'error' && (
                <p className="text-red-400 text-sm">Something went wrong — please try again.</p>
              )}

              <button
                type="submit"
                disabled={status === 'sending' || !form.email || !form.name || !form.focus}
                className="w-full bg-[#D4AF37] hover:opacity-90 text-black font-black py-4 rounded-xl transition text-base disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              >
                {status === 'sending' ? 'Submitting…' : 'Get Early Access →'}
              </button>

              <p className="text-center text-xs text-white/25">
                No credit card · No spam · Aaron replies personally
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
