'use client';

import { useState, useEffect } from 'react';

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
  selectedPlan?: string;
}

export default function LeadCaptureModal({ isOpen, onClose, selectedPlan }: Props) {
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
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'called'>('idle');
  const [healthStatus, setHealthStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleClose = () => {
    setForm({ firstName: '', businessName: '', email: '', phone: '', industry: '', website: '' });
    setAgreed(false);
    setStatus('idle');
    setCallStatus('idle');
    setHealthStatus('idle');
    onClose();
  };

  // Auto-fire Sophie call on success — runs once when status flips to 'done'
  useEffect(() => {
    if (status !== 'done' || !form.phone) return;
    setCallStatus('calling');
    fetch('/api/demo-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.firstName,
        phone: form.phone,
        email: form.email,
        businessName: form.businessName,
        industry: form.industry,
      }),
    })
      .then(() => setCallStatus('called'))
      .catch(() => setCallStatus('called'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // intentional: only fire once when status changes to 'done'

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
          plan: selectedPlan || 'Trial',
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
          <div className="py-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎉</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                You&apos;re in{form.firstName ? `, ${form.firstName}` : ''}!
              </h2>
              <p className="text-gray-400 text-sm">
                {selectedPlan ? `${selectedPlan} — 14-day free trial` : '14-day free trial starting now'}
              </p>
            </div>

            {/* Sophie call status */}
            <div className={`rounded-xl p-4 mb-3 border ${callStatus === 'called' ? 'bg-green-500/10 border-green-500/20' : 'bg-[#1a1a1a] border-[#2a2a2a]'}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{callStatus === 'called' ? '✅' : '📞'}</span>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {callStatus === 'calling' ? 'Sophie is calling you now…' : callStatus === 'called' ? 'Sophie is on the way!' : 'Connecting Sophie to your number…'}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {callStatus === 'called' ? `Calling ${form.phone} — answer in the next 60 seconds` : 'Your AI sales agent calls within 60 seconds'}
                  </p>
                </div>
                {callStatus === 'calling' && <div role="status" aria-label="Loading" className="ml-auto w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin flex-shrink-0" />}
              </div>
            </div>

            {/* Free health report */}
            <div className="rounded-xl p-4 mb-4 border border-[#2a2a2a] bg-[#111]">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">🩺</span>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm mb-1">Free Digital Health Report</p>
                  <p className="text-gray-500 text-xs leading-relaxed mb-3">See exactly what&apos;s costing you leads — speed, SEO, mobile, and conversion gaps. Takes 60 seconds.</p>
                  {healthStatus === 'sent' ? (
                    <p className="text-green-400 text-xs font-semibold">✅ Report on its way to {form.email}</p>
                  ) : (
                    <button
                      onClick={async () => {
                        if (!form.website && !form.businessName) return;
                        setHealthStatus('sending');
                        try {
                          await fetch('/api/health-check', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: form.firstName, email: form.email, business: form.businessName, website: form.website, phone: form.phone }),
                          });
                        } catch { /* non-fatal */ }
                        setHealthStatus('sent');
                      }}
                      disabled={healthStatus === 'sending'}
                      className="px-4 py-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg text-xs font-bold hover:bg-[#D4AF37]/20 transition disabled:opacity-50"
                    >
                      {healthStatus === 'sending' ? 'Generating…' : 'Get my free report →'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 bg-[#D4AF37] text-black font-bold rounded-xl text-sm hover:opacity-90 transition"
            >
              Go to dashboard →
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <>
            <h2 className="text-xl font-bold text-white mb-1">
              {selectedPlan ? `Start ${selectedPlan} — 14 days free` : 'Start your free trial'}
            </h2>
            <div className="h-0.5 w-12 rounded-full bg-[#D4AF37] mb-4" />
            <p className="text-white/40 text-sm mb-6 leading-relaxed">
              Tell us about your business. Aaron will reach out personally to get your AI team live.
            </p>

            <form onSubmit={submit} className="space-y-3">
              {/* First Name */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">First Name *</label>
                <input
                  required
                  type="text"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={e => set('firstName', e.target.value)}
                  placeholder="Jane"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* Business Name */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Business Name *</label>
                <input
                  required
                  type="text"
                  autoComplete="organization"
                  value={form.businessName}
                  onChange={e => set('businessName', e.target.value)}
                  placeholder="ACME Pty Ltd"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Email Address *</label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="jane@business.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Phone Number *</label>
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="+61 400 000 000"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
                />
              </div>

              {/* Industry */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Industry *</label>
                <select
                  required
                  value={form.industry}
                  onChange={e => set('industry', e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors text-sm appearance-none"
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
                  autoComplete="url"
                  value={form.website}
                  onChange={e => set('website', e.target.value)}
                  placeholder="https://yoursite.com.au"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
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
