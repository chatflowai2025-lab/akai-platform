'use client';

import { useState } from 'react';

const PLANS = [
  {
    name: 'Starter',
    monthlyPrice: '$49',
    annualPrice: '$39',
    period: '/mo',
    annualNote: 'Save 20% annually',
    description: 'One AI agent, fully operational.',
    features: [
      '1 AKAI agent of your choice',
      'AI automation included',
      'Full dashboard access',
      '60 voice mins · 5k emails/mo',
      '1,000 AI tasks/month',
    ],
    cta: 'Start Free Trial →',
    highlight: false,
    badge: null,
  },
  {
    name: 'Growth',
    monthlyPrice: '$149',
    annualPrice: '$119',
    period: '/mo',
    annualNote: 'Save 20% annually',
    description: 'Three agents. Sales rep + marketer + VA — replaced.',
    features: [
      '3 AKAI agents of your choice',
      'Sales + Email Guard + Social recommended',
      'Team seats (up to 5)',
      'Advanced analytics & reporting',
      'Onboarding call included',
      '300 voice mins · 25k emails/mo',
    ],
    cta: 'Start Free Trial →',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Agency',
    monthlyPrice: '$399',
    annualPrice: '$319',
    period: '/mo',
    annualNote: 'Save 20% annually',
    description: 'All 9 agents. Your entire ops team — automated.',
    features: [
      'All 9 AKAI agents',
      'Unlimited team seats',
      'Dedicated account manager',
      '1,200 voice mins · unlimited emails',
      'White-label option available',
    ],
    cta: 'Start Free Trial →',
    highlight: false,
    badge: null,
  },
];

export default function Pricing({ onOpenCapture }: { onOpenCapture?: (plan?: string) => void }) {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="relative py-32 px-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight text-white">
            Your AI team.{' '}
            <span className="text-[#D4AF37]">At 1% of the cost.</span>
          </h2>
          <p className="text-white/40 text-lg mb-8">
            14-day free trial · Cancel anytime · No setup fees
          </p>

          {/* Annual toggle */}
          <div className="inline-flex items-center gap-3 bg-[#111] border border-[#2a2a2a] rounded-full p-1 pr-4">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                !annual ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                annual ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'
              }`}
            >
              Annual
            </button>
            <span className="text-[#D4AF37] text-xs font-bold">Save 20%</span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-7 flex flex-col overflow-hidden transition-all duration-200 ${
                plan.highlight
                  ? 'border-gradient glow-gold'
                  : 'bg-[#111] border border-[#1f1f1f] hover:border-[#D4AF37]/20'
              }`}
            >
              {/* Highlight glow */}
              {plan.highlight && (
                <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/[0.06] to-transparent pointer-events-none" />
              )}

              {/* Most Popular badge */}
              {plan.badge && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                  <div className="bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-b-lg">
                    {plan.badge}
                  </div>
                </div>
              )}

              <div className="relative mt-4 flex flex-col flex-1">
                {/* Plan name */}
                <div className="text-xs text-white/40 uppercase tracking-widest mb-3">{plan.name}</div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-5xl font-black tracking-tight ${plan.highlight ? 'text-[#D4AF37]' : 'text-white'}`}>
                    {annual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-white/30 text-sm">{plan.period}</span>
                </div>

                {/* Annual note */}
                {annual && (
                  <div className="mb-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      plan.highlight ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-white/[0.06] text-white/40'
                    }`}>
                      {plan.annualNote}
                    </span>
                  </div>
                )}

                <p className="text-white/40 text-sm mb-7 leading-relaxed">{plan.description}</p>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-white/60">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5 ${
                        plan.highlight ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/[0.06] text-white/40'
                      }`}>
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => onOpenCapture?.(plan.name)}
                  className={`block w-full text-center py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    plan.highlight
                      ? 'bg-[#D4AF37] text-black hover:opacity-90 shadow-lg shadow-[#D4AF37]/20'
                      : 'bg-white/[0.06] border border-white/[0.08] text-white hover:border-white/20 hover:bg-white/[0.08]'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise row */}
        <div className="mt-6 rounded-2xl bg-[#111] border border-[#1f1f1f] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold text-sm">Enterprise — Custom Pricing</p>
            <p className="text-white/40 text-sm mt-0.5">
              Multi-location, white-label, custom integrations, volume pricing. We&apos;ll build a plan around your team.
            </p>
          </div>
          <a
            href="mailto:hello@getakai.ai"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl border border-[#D4AF37]/40 text-[#D4AF37] text-sm font-semibold hover:bg-[#D4AF37]/10 transition-all whitespace-nowrap"
          >
            Talk to us →
          </a>
        </div>
      </div>
    </section>
  );
}
