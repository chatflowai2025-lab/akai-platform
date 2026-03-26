'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

/* ─── Types ─── */
type ModalType = 'demo' | 'healthcheck' | null;

/* ─── Demo Call Modal ─── */
function DemoModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    businessName: '', website: '', industry: '',
    challenge: '', leadsPerMonth: '',
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    setStatus('loading');
    try {
      const res = await fetch('/api/demo-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Try Live Agent Now" accent="#22c55e" onClose={onClose}>
        {status === 'success' ? (
          <SuccessState msg="📞 We're calling you now!" sub="Expect a call within 60 seconds." />
        ) : (
          <>
            <StepIndicator current={step} total={3} />

            {step === 1 && (
              <div className="flex flex-col gap-4 mt-4">
                <Field label="Full name *" value={form.name} onChange={v => set('name', v)} placeholder="Jane Smith" />
                <Field label="Email *" value={form.email} onChange={v => set('email', v)} placeholder="jane@business.com" type="email" />
                <Field label="Phone number *" value={form.phone} onChange={v => set('phone', v)} placeholder="+61 400 000 000" type="tel" />
                <NavBtn
                  label="Next →"
                  disabled={!form.name || !form.phone || !form.email}
                  onClick={() => setStep(2)}
                />
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4 mt-4">
                <Field label="Business name *" value={form.businessName} onChange={v => set('businessName', v)} placeholder="ACME Pty Ltd" />
                <Field label="Website URL" value={form.website} onChange={v => set('website', v)} placeholder="https://yoursite.com.au" />
                <Select
                  label="Industry *"
                  value={form.industry}
                  onChange={v => set('industry', v)}
                  options={['Trades', 'Real Estate', 'Legal', 'Medical', 'Finance', 'Retail', 'Other']}
                />
                <div className="flex gap-3">
                  <BackBtn onClick={() => setStep(1)} />
                  <NavBtn
                    label="Next →"
                    disabled={!form.businessName || !form.industry}
                    onClick={() => setStep(3)}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-4 mt-4">
                <Select
                  label="Biggest challenge right now? *"
                  value={form.challenge}
                  onChange={v => set('challenge', v)}
                  options={[
                    'Not enough leads',
                    "Leads don't convert",
                    "Can't follow up fast enough",
                    'No time to do sales',
                    'Other',
                  ]}
                />
                <Select
                  label="Leads per month? *"
                  value={form.leadsPerMonth}
                  onChange={v => set('leadsPerMonth', v)}
                  options={['0–10', '10–50', '50–100', '100+']}
                />
                {status === 'error' && (
                  <p className="text-red-400 text-sm">Something went wrong — try again.</p>
                )}
                <div className="flex gap-3">
                  <BackBtn onClick={() => setStep(2)} />
                  <NavBtn
                    label={status === 'loading' ? 'Calling…' : 'Get My Demo Call →'}
                    disabled={!form.challenge || !form.leadsPerMonth || status === 'loading'}
                    onClick={submit}
                    gold
                  />
                </div>
              </div>
            )}
          </>
        )}
      </ModalCard>
    </Overlay>
  );
}

/* ─── Health Check Modal ─── */
function HealthCheckModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [form, setForm] = useState({
    name: '', email: '', website: '', phone: '',
    businessType: '',
    audits: [] as string[],
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function toggleAudit(a: string) {
    setForm(f => ({
      ...f,
      audits: f.audits.includes(a) ? f.audits.filter(x => x !== a) : [...f.audits, a],
    }));
  }

  async function submit() {
    setStatus('loading');
    try {
      const res = await fetch('/api/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  const auditOptions = [
    'Website speed',
    'SEO',
    'Lead capture',
    'Social presence',
    'Ad spend efficiency',
  ];

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Free Digital Health Check" accent="#8B5CF6" onClose={onClose}>
        {status === 'success' ? (
          <SuccessState
            msg="✅ Health check booked!"
            sub="Check your inbox — we'll send your full report within 24 hours."
          />
        ) : (
          <>
            <StepIndicator current={step} total={2} />

            {step === 1 && (
              <div className="flex flex-col gap-4 mt-4">
                <Field label="Full name *" value={form.name} onChange={v => set('name', v)} placeholder="Jane Smith" />
                <Field label="Email *" value={form.email} onChange={v => set('email', v)} placeholder="jane@business.com" type="email" />
                <Field label="Website URL *" value={form.website} onChange={v => set('website', v)} placeholder="https://yoursite.com.au" />
                <Field label="Phone" value={form.phone} onChange={v => set('phone', v)} placeholder="+61 400 000 000" type="tel" />
                <NavBtn
                  label="Next →"
                  disabled={!form.name || !form.email || !form.website}
                  onClick={() => setStep(2)}
                />
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4 mt-4">
                <Field label="Business type" value={form.businessType} onChange={v => set('businessType', v)} placeholder="e.g. Plumbing, Legal, Retail" />
                <div>
                  <p className="text-sm text-white/60 mb-2">What do you want us to audit?</p>
                  <div className="flex flex-col gap-2">
                    {auditOptions.map(a => (
                      <label key={a} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={form.audits.includes(a)}
                          onChange={() => toggleAudit(a)}
                          className="w-4 h-4 rounded accent-purple-500"
                        />
                        <span className="text-sm text-white/70 group-hover:text-white transition-colors">{a}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {status === 'error' && (
                  <p className="text-red-400 text-sm">Something went wrong — try again.</p>
                )}
                <div className="flex gap-3">
                  <BackBtn onClick={() => setStep(1)} />
                  <NavBtn
                    label={status === 'loading' ? 'Submitting…' : 'Book My Health Check →'}
                    disabled={form.audits.length === 0 || status === 'loading'}
                    onClick={submit}
                    gold={false}
                    accent="#8B5CF6"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </ModalCard>
    </Overlay>
  );
}

/* ─── Shared UI Primitives ─── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function ModalCard({
  title, accent, onClose, children,
}: { title: string; accent: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6 w-full max-w-md relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/40 hover:text-white text-xl leading-none"
      >
        ×
      </button>
      <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
      <div className="h-0.5 w-12 rounded-full mb-2" style={{ background: accent }} />
      {children}
    </div>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all ${
            i + 1 <= current ? 'bg-[#D4AF37]' : 'bg-white/10'
          }`}
        />
      ))}
      <span className="text-xs text-white/30 ml-1">{current}/{total}</span>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-xs text-white/50 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
      />
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-xs text-white/50 mb-1 block">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37] transition-colors text-sm appearance-none"
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function NavBtn({
  label, onClick, disabled, gold = true, accent,
}: { label: string; onClick: () => void; disabled?: boolean; gold?: boolean; accent?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={!gold && accent && !disabled ? { background: accent } : undefined}
      className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed
        ${gold ? 'bg-[#D4AF37] text-black hover:opacity-90' : accent ? 'text-white hover:opacity-90' : 'bg-white/10 text-white hover:bg-white/20'}`}
    >
      {label}
    </button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white border border-white/10 hover:border-white/30 transition-all"
    >
      ← Back
    </button>
  );
}

function SuccessState({ msg, sub }: { msg: string; sub: string }) {
  return (
    <div className="text-center py-6">
      <p className="text-white text-xl font-bold mb-2">{msg}</p>
      <p className="text-white/50 text-sm">{sub}</p>
    </div>
  );
}

/* ─── Main Hero ─── */
export default function Hero() {
  const { user, loading } = useAuth();
  const ctaHref = !loading && user ? '/dashboard' : '/login';
  const [modal, setModal] = useState<ModalType>(null);

  return (
    <>
      {modal === 'demo' && <DemoModal onClose={() => setModal(null)} />}
      {modal === 'healthcheck' && <HealthCheckModal onClose={() => setModal(null)} />}

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
          Sales · Recruit · Web · Ads · Social · Email
        </p>
        <p className="fade-up fade-up-3 text-lg text-white/60 max-w-2xl mb-10 leading-relaxed">
          Describe your business. AKAI builds it, runs it, and grows it —
          <span className="text-white"> while you close deals.</span>
        </p>

        {/* CTA row — 4 buttons */}
        <div className="fade-up fade-up-4 flex flex-wrap justify-center gap-4 items-center mb-20">
          <Button href={ctaHref} size="lg" className="glow-gold-sm min-w-[200px]">
            Start Free Trial →
          </Button>
          <button
            onClick={() => setModal('demo')}
            className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 px-10 py-4 text-lg min-w-[200px] bg-green-500 text-white hover:bg-green-400 shadow-lg shadow-green-500/20"
          >
            🎙️ Try Live Agent Now
          </button>
          <button
            onClick={() => setModal('healthcheck')}
            className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 px-10 py-4 text-lg min-w-[240px] border border-purple-500/40 text-purple-300 hover:border-purple-400 hover:text-purple-200 hover:bg-purple-500/10"
          >
            Free Digital Health Check
          </button>
          <Button href="#how-it-works" variant="secondary" size="lg">
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
    </>
  );
}
