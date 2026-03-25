const PLANS = [
  {
    name: 'Starter',
    price: '$297',
    period: '/mo',
    description: 'One AI module, fully operational.',
    features: [
      '1 AKAI module',
      '500 leads/mo',
      'AI automation',
      'Basic dashboard',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$597',
    period: '/mo',
    description: 'Three modules, full automation stack.',
    features: [
      '3 AKAI modules',
      '2,000 leads/mo',
      'Team seats (5)',
      'Advanced analytics',
      'Priority support',
      'Onboarding call',
    ],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Scale',
    price: '$1,197',
    period: '/mo',
    description: 'All 5 modules, unlimited everything.',
    features: [
      'All 5 AKAI modules',
      'Unlimited leads',
      'Unlimited team seats',
      'Dedicated account manager',
      'White-label option',
      'SLA guarantee',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-32 px-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
            Simple pricing.{' '}
            <span className="gradient-text">Serious ROI.</span>
          </h2>
          <p className="text-white/40 text-lg">
            7-day free trial · Cancel anytime · No setup fees
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
              {plan.highlight && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                  <div className="bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-b-lg">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="relative mt-4">
                {/* Plan name */}
                <div className="text-xs text-white/40 uppercase tracking-widest mb-3">{plan.name}</div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-5xl font-black tracking-tight ${plan.highlight ? 'gradient-text' : 'text-white'}`}>
                    {plan.price}
                  </span>
                  <span className="text-white/30 text-sm">{plan.period}</span>
                </div>

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
                <a
                  href="/onboard"
                  className={`block w-full text-center py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    plan.highlight
                      ? 'bg-[#D4AF37] text-black hover:opacity-90 glow-gold-sm'
                      : 'glass border border-white/[0.08] text-white hover:border-white/20'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise line */}
        <p className="text-center text-white/20 text-sm mt-10">
          Need a custom plan?{' '}
          <a href="mailto:hello@getakai.ai" className="text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors">
            Talk to us →
          </a>
        </p>
      </div>
    </section>
  );
}
