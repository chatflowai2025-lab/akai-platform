import Button from '@/components/ui/Button';

const PLANS = [
  {
    name: 'Starter',
    price: '$297',
    period: '/mo',
    description: 'One module, fully operational.',
    features: ['1 AKAI module', '500 leads/mo', 'AI automation', 'Basic dashboard', 'Email support'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$597',
    period: '/mo',
    description: 'Three modules, full automation.',
    features: ['3 AKAI modules', '2,000 leads/mo', 'Team seats (5)', 'Advanced analytics', 'Priority support', 'Onboarding call'],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Scale',
    price: '$1,197',
    period: '/mo',
    description: 'All 5 modules, unlimited everything.',
    features: ['All 5 AKAI modules', 'Unlimited leads', 'Unlimited team seats', 'Dedicated account manager', 'White-label option', 'SLA guarantee'],
    cta: 'Start Free Trial',
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 border-t border-[#1f1f1f]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Simple pricing. <span className="text-[#D4AF37]">Serious ROI.</span>
          </h2>
          <p className="text-gray-400 text-lg">
            7-day free trial. Cancel anytime. No setup fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`p-6 rounded-2xl border flex flex-col ${
                plan.highlight
                  ? 'bg-[#D4AF37]/5 border-[#D4AF37]/40'
                  : 'bg-[#111] border-[#1f1f1f]'
              }`}
            >
              {plan.highlight && (
                <div className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-3">
                  Most Popular
                </div>
              )}

              <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-gray-400">{plan.period}</span>
              </div>
              <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-[#D4AF37]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                href="/onboard"
                variant={plan.highlight ? 'primary' : 'secondary'}
                className="w-full justify-center"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-500 text-sm mt-8">
          Enterprise pricing available.{' '}
          <a href="mailto:hello@akai.ai" className="text-[#D4AF37] hover:underline">
            Contact us →
          </a>
        </p>
      </div>
    </section>
  );
}
