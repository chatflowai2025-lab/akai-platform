const PLANS = [
  {
    name: 'Starter',
    price: '$299',
    annual: '$1,470/yr',
    annualNote: 'Save 2 months',
    period: '/mo',
    description: 'One AI agent, fully operational.',
    roiBadge: '13× ROI',
    features: [
      '1 AKAI agent of your choice',
      'Social is the most popular starter',
      'AI automation included',
      'Full dashboard access',
      '60 voice mins · 5k emails · 1k AI tasks/mo',
      'Replaces a part-time VA (~$2,000/mo)',
    ],
    cta: 'Start 14-day free trial →',
    highlight: false,
    badge: null,
  },
  {
    name: 'Growth',
    price: '$599',
    annual: '$4,970/yr',
    annualNote: 'Save 2 months',
    period: '/mo',
    description: 'Three agents. Sales rep + marketer + VA — replaced.',
    roiBadge: '27× ROI',
    features: [
      '3 AKAI agents of your choice',
      'Sales + Email Guard + Social recommended',
      'Team seats (up to 5)',
      'Advanced analytics',
      'Onboarding call included',
      '300 voice mins · 25k emails · 5k AI tasks/mo',
      'Replaces sales rep + marketing + VA (~$13,500/mo)',
    ],
    cta: 'Start 14-day free trial →',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Scale',
    price: '$1,200',
    annual: '$14,970/yr',
    annualNote: 'Save 2 months',
    period: '/mo',
    description: 'All 10 agents. Your entire ops team — automated.',
    roiBadge: '20× ROI',
    features: [
      'All 10 AKAI agents',
      'Sales, Voice, Web, Email Guard, Calendar',
      'Proposals, Ads, Recruit, Social & Health',
      'Unlimited team seats',
      'Dedicated account manager',
      '1,200 voice mins · unlimited emails · unlimited AI tasks',
      'White-label option + SLA guarantee',
      'Replaces your entire ops team (~$30,000/mo)',
    ],
    cta: 'Start 14-day free trial →',
    highlight: false,
    badge: null,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    annual: '',
    annualNote: '',
    period: '',
    description: 'Dedicated environment. Custom integrations. Full white-label.',
    roiBadge: null,
    features: [
      'Dedicated cloud environment',
      'Custom API integrations',
      'White-label under your brand',
      'Multi-location & multi-tenant',
      'Enterprise SLA (99.99% uptime)',
      'Dedicated success team',
      'Volume pricing available',
      'On-site onboarding option',
    ],
    cta: 'Contact us →',
    highlight: false,
    badge: 'Enterprise',
  },
];

export default function Pricing({ onOpenCapture }: { onOpenCapture?: (plan?: string) => void }) {
  return (
    <section id="pricing" className="relative py-32 px-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
            Your ops team.{' '}
            <span className="gradient-text">At 1% of the cost.</span>
          </h2>
          <p className="text-white/40 text-lg">
            14-day free trial · Cancel anytime · No setup fees
          </p>
          <p className="text-white/30 text-sm mt-2">
            Annual plans available — pay yearly, save 2 months
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-7 flex flex-col overflow-hidden transition-all duration-200 ${
                plan.highlight
                  ? 'border-gradient glow-gold'
                  : 'glass card-hover'
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
                {/* Plan name + ROI badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-white/40 uppercase tracking-widest">{plan.name}</div>
                  {plan.roiBadge && (
                    <div className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      plan.highlight ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/[0.06] text-white/50'
                    }`}>
                      {plan.roiBadge}
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-xs text-white/30 font-semibold mr-0.5">from</span>
                  <span className={`text-5xl font-black tracking-tight ${plan.highlight ? 'gradient-text' : 'text-white'}`}>
                    {plan.price}
                  </span>
                  <span className="text-white/30 text-sm">{plan.period}</span>
                </div>

                {/* Annual option */}
                {plan.annual && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-white/30 text-xs">{plan.annual}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      plan.highlight ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-white/[0.04] text-white/30'
                    }`}>{plan.annualNote}</span>
                  </div>
                )}

                <p className="text-white/40 text-sm mb-7 leading-relaxed">{plan.description}</p>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white/60">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
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
                      ? 'bg-[#D4AF37] text-black hover:opacity-90 glow-gold-sm'
                      : 'glass border border-white/[0.08] text-white hover:border-white/20'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise / Custom */}
        <div className="mt-6 rounded-2xl glass border border-white/[0.06] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold text-sm">Custom — Enterprise</p>
            <p className="text-white/40 text-sm mt-0.5">
              Multi-location, white-label, custom integrations, volume pricing. We&apos;ll build a plan around your team.
            </p>
          </div>
          <a
            href="mailto:hello@getakai.ai"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl border border-[#D4AF37]/40 text-[#D4AF37] text-sm font-semibold hover:bg-[#D4AF37]/10 transition-all"
          >
            Talk to us →
          </a>
        </div>
      </div>
    </section>
  );
}
