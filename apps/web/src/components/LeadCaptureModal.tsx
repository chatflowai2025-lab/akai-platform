'use client';

import { useState } from 'react';

const INDUSTRIES = [
  'Trades',
  'Real Estate',
  'Legal',
  'Medical & Health',
  'Finance',
  'Retail',
  'Hospitality',
  'Recruitment',
  'Technology',
  'Marketing & Advertising',
  'Education',
  'Construction',
  'Transport & Logistics',
  'Other',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function LeadCaptureModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState({
    firstName: '',
    businessName: '',
    email: '',
    phone: '',
    industry: '',
    website: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleClose = () => {
    // Reset on close
    setForm({ firstName: '', businessName: '', email: '', phone: '', industry: '', website: '' });
    setAgreed(false);
    setStatus('idle');
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/trial-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.firstName,
          email: form.email,
          business: form.businessName,
          phone: form.phone,
          industry: form.industry,
          website: form.website,
        }),
      });
      if (!res.ok) throw new Error('Failed');
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
        className="w-full max-w-md bg-[#111] border border-[#2a2a2a] rounded-2xl p-7 shadow-2xl relative overflow-y-auto max-h-[92vh]"
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
          /* ── Success screen ── */
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 flex items-center justify-center mx-auto mb-5">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-3">
              Thanks {form.firstName}!
            </h2>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              We&apos;re analysing your business and will send your personalised report within 24 hours.
            </p>
            <button
              onClick={handleClose}
              className="bg-[#D4AF37] text-black font-bold px-8 py-3 rounded-xl text-sm hover:opacity-90 transition"
            >
              Close
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <>
            <h2 className="text-xl font-bold text-white mb-1">Start your free trial</h2>
            <div className="h-0.5 w-12 rounded-full bg-[#D4AF37] mb-4" />
            <p className="text-white/40 text-sm mb-6 leading-relaxed">
              Tell us about your business and we&apos;ll get AKAI running for you within 24 hours.
            </p>

            <form onSubmit={submit} className="space-y-3">
              {/* First Name */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">First Name *</label>
                <input
                  required
                  type="text"
                  value={form.firstName}
                  onChange={e => set('firstName', e.target.value)}
                  placeholder="Jane"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Business Name *</label>
                <input
                  required
                  type="text"
                  value={form.businessName}
                  onChange={e => set('businessName', e.target.value)}
                  placeholder="ACME Pty Ltd"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Email Address *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="jane@business.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Phone Number *</label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="+61 400 000 000"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* Industry */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Industry *</label>
                <select
                  required
                  value={form.industry}
                  onChange={e => set('industry', e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] transition-colors text-sm appearance-none"
                >
                  <option value="">Select your industry…</option>
                  {INDUSTRIES.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              {/* Website */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Website URL</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={e => set('website', e.target.value)}
                  placeholder="https://yoursite.com.au"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* T&Cs */}
              <label className="flex items-start gap-3 cursor-pointer group pt-1">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  required
                  className="mt-0.5 w-4 h-4 rounded accent-[#D4AF37] flex-shrink-0"
                />
                <span className="text-xs text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">
                  I agree to the{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#D4AF37] hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    Terms of Service
                  </a>
                  {' '}and consent to AKAI contacting me about my trial.
                </span>
              </label>

              {status === 'error' && (
                <p className="text-red-400 text-sm">Something went wrong — please try again.</p>
              )}

              <button
                type="submit"
                disabled={status === 'sending' || !agreed}
                className="w-full bg-[#D4AF37] hover:opacity-90 text-black font-bold py-3.5 rounded-xl transition text-sm disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                {status === 'sending' ? 'Submitting…' : 'Get Started — It\'s Free →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
