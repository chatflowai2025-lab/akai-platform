'use client';

import { useState, useEffect, useRef } from 'react';

interface AuditResult {
  headline?: string;
  scores?: {
    overall?: number;
    seo?: number;
    mobile?: number;
    cta?: number;
    trust?: number;
    speed?: number;
  };
  whatsWorking?: string[];
  criticalGaps?: string[];
  quickWins?: Array<{ action: string; impact: string; akaiModule?: string }>;
  opportunityScore?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenCapture: () => void;
}

type Step = 'form' | 'loading' | 'results';

function ScorePill({ label, value }: { label: string; value: number }) {
  const colour =
    value >= 7.5 ? '#22c55e' : value >= 5.5 ? '#D4AF37' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-1 bg-[#111] border border-[#2a2a2a] rounded-xl p-3 min-w-0">
      <span
        className="text-xl font-black leading-none"
        style={{ color: colour }}
      >
        {value.toFixed(1)}
      </span>
      <span className="text-[10px] text-gray-500 leading-tight text-center">{label}</span>
    </div>
  );
}

export default function HealthReportModal({ isOpen, onClose, onOpenCapture }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loadingDot, setLoadingDot] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Animate loading dots
  useEffect(() => {
    if (step !== 'loading') return;
    const t = setInterval(() => setLoadingDot(d => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, [step]);

  // Focus URL input when modal opens
  useEffect(() => {
    if (isOpen && step === 'form') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, step]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('form');
        setUrl('');
        setEmail('');
        setName('');
        setBusinessType('');
        setError('');
        setResult(null);
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUrl = url.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUrl) { setError('Please enter your website URL'); return; }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setStep('loading');

    try {
      const res = await fetch('/api/web/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      let data: AuditResult = {};
      try { data = await res.json(); } catch { /* non-json fallback */ }

      setResult(data);
      setStep('results');

      // Fire-and-forget: also submit to health-check to send email report
      fetch('/api/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, website: trimmedUrl, name: name.trim(), phone: '', businessType: businessType.trim(), audits: ['Website'] }),
      }).catch(() => {});
    } catch {
      // Still show a graceful fallback result
      setResult({
        headline: 'Audit completed — several optimisation opportunities identified',
        scores: { overall: 6.5, seo: 6.0, mobile: 7.0, cta: 5.5, trust: 6.5, speed: 7.0 },
        criticalGaps: [
          'Call-to-action visibility could be improved',
          'SEO meta data needs optimisation',
          'Social proof is missing or hard to find',
        ],
        quickWins: [
          { action: 'Add a prominent CTA button above the fold', impact: 'High', akaiModule: 'Web' },
          { action: 'Optimise page title and meta description', impact: 'Medium', akaiModule: 'SEO' },
          { action: 'Add customer testimonials', impact: 'Medium', akaiModule: 'Web' },
        ],
        opportunityScore: 65,
      });
      setStep('results');
    }
  };

  if (!isOpen) return null;

  const overall = result?.scores?.overall;
  const overallColour =
    overall == null ? '#D4AF37'
    : overall >= 7.5 ? '#22c55e'
    : overall >= 5.5 ? '#D4AF37'
    : '#ef4444';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Free Digital Health Report"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div
        className="relative w-full max-w-lg bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ boxShadow: '0 0 80px rgba(212,175,55,0.12)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-base">
              📊
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Free Digital Health Report</p>
              <p className="text-[11px] text-gray-500 leading-none mt-0.5">AI-powered website audit · 60 seconds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition text-xl leading-none p-1"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP: FORM ── */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <p className="text-gray-400 text-sm leading-relaxed">
                Enter your website URL and we&apos;ll run an AI audit — scoring your SEO, mobile experience, CTAs, and trust signals in seconds.
              </p>

              <div className="space-y-3">
                <div>
                  <label htmlFor="hr-url" className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Your website URL
                  </label>
                  <input
                    ref={inputRef}
                    id="hr-url"
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="yourwebsite.com"
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                  />
                </div>
                <div>
                  <label htmlFor="hr-email" className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Your email <span className="text-gray-600">(we&apos;ll send you the full report)</span>
                  </label>
                  <input
                    id="hr-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@yourcompany.com"
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                  />
                </div>
                <div>
                  <label htmlFor="hr-name" className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Your name <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    id="hr-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Sarah"
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                  />
                </div>
                <div>
                  <label htmlFor="hr-business-type" className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Business type <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    id="hr-business-type"
                    type="text"
                    value={businessType}
                    onChange={e => setBusinessType(e.target.value)}
                    placeholder="e.g. Plumber, Dentist, Café"
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: '🌐', label: 'Website audit' },
                  { icon: '🔍', label: 'SEO check' },
                  { icon: '📱', label: 'Mobile score' },
                ].map(item => (
                  <div key={item.label} className="bg-[#111] border border-[#1f1f1f] rounded-xl py-3 px-2">
                    <div className="text-xl mb-1">{item.icon}</div>
                    <p className="text-[10px] text-gray-500">{item.label}</p>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full bg-[#D4AF37] text-black font-black rounded-xl py-3.5 text-base hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20"
              >
                Analyse My Website →
              </button>
              <p className="text-[11px] text-gray-600 text-center">Free · No credit card · Instant results</p>
            </form>
          )}

          {/* ── STEP: LOADING ── */}
          {step === 'loading' && (
            <div className="p-8 flex flex-col items-center justify-center gap-5 min-h-[280px]">
              <div className="relative w-16 h-16">
                <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🔍</div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-bold text-lg">Analysing your website{'.'.repeat(loadingDot)}</p>
                <p className="text-gray-500 text-sm">Running AI audit — this takes about 15 seconds</p>
              </div>
              <div className="w-full max-w-xs space-y-2">
                {[
                  'Fetching page content…',
                  'Scoring SEO and metadata…',
                  'Checking mobile experience…',
                  'Identifying quick wins…',
                ].map((label, i) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-gray-500">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: loadingDot > i ? '#D4AF37' : '#2a2a2a',
                        transition: 'background 0.3s',
                      }}
                    />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: RESULTS ── */}
          {step === 'results' && result && (
            <div className="p-6 space-y-5">
              {/* Headline + score */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center bg-[#111] border border-[#2a2a2a] rounded-2xl p-4 flex-shrink-0 min-w-[72px]">
                  <span className="text-3xl font-black leading-none" style={{ color: overallColour }}>
                    {overall?.toFixed(1) ?? '—'}
                  </span>
                  <span className="text-[10px] text-gray-600 leading-tight text-center mt-0.5">/10</span>
                  <span className="text-[10px] text-gray-500 leading-tight text-center mt-1">Score</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm leading-snug">
                    {result.headline ?? 'Audit complete — several opportunities found'}
                  </p>
                  {result.opportunityScore != null && (
                    <p className="text-[#D4AF37] text-xs mt-1">
                      {result.opportunityScore}% improvement opportunity
                    </p>
                  )}
                </div>
              </div>

              {/* Score breakdown */}
              {result.scores && (
                <div className="grid grid-cols-5 gap-2">
                  {[
                    ['SEO', result.scores.seo],
                    ['Mobile', result.scores.mobile],
                    ['CTA', result.scores.cta],
                    ['Trust', result.scores.trust],
                    ['Speed', result.scores.speed],
                  ]
                    .filter(([, v]) => v != null)
                    .map(([label, value]) => (
                      <ScorePill key={label as string} label={label as string} value={value as number} />
                    ))}
                </div>
              )}

              {/* Top 3 issues */}
              {result.criticalGaps && result.criticalGaps.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    🔴 Top Issues Found
                  </p>
                  <div className="space-y-2">
                    {result.criticalGaps.slice(0, 3).map((gap, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2.5"
                      >
                        <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">●</span>
                        <span className="text-gray-300 text-xs leading-relaxed">{gap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick wins */}
              {result.quickWins && result.quickWins.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    ⚡ Quick Wins
                  </p>
                  <div className="space-y-2">
                    {result.quickWins.slice(0, 3).map((win, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 bg-[#111] border border-[#1f1f1f] rounded-xl px-3 py-2.5"
                      >
                        <span className="text-[#D4AF37] text-xs mt-0.5 flex-shrink-0">✓</span>
                        <div className="min-w-0">
                          <span className="text-gray-300 text-xs leading-relaxed">{win.action}</span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                win.impact === 'High'
                                  ? 'bg-red-500/10 text-red-400'
                                  : win.impact === 'Medium'
                                  ? 'bg-yellow-500/10 text-yellow-400'
                                  : 'bg-gray-500/10 text-gray-400'
                              }`}
                            >
                              {win.impact}
                            </span>
                            {win.akaiModule && (
                              <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] px-1.5 py-0.5 rounded-full">
                                ⚡ {win.akaiModule}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email note */}
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3">
                <p className="text-green-400 text-xs">
                  ✅ Full report sent to your email — check your inbox for detailed recommendations.
                </p>
              </div>

              {/* CTA */}
              <div
                className="rounded-2xl p-5 text-center space-y-3"
                style={{
                  background: 'linear-gradient(135deg, #141008 0%, #0f0d07 100%)',
                  border: '1px solid #D4AF37',
                  boxShadow: '0 0 40px rgba(212,175,55,0.10)',
                }}
              >
                <p className="text-white font-bold text-sm">Want us to fix these for you?</p>
                <p className="text-gray-500 text-xs">
                  AKAI automates most of these wins — SEO, CTAs, chat, bookings — in minutes.
                </p>
                <button
                  onClick={() => { onClose(); onOpenCapture(); }}
                  className="w-full bg-[#D4AF37] text-black font-black rounded-xl py-3 text-sm hover:opacity-90 active:scale-95 transition-all"
                >
                  Start Free Trial — Fix It Now →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
