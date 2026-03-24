const MODULES = [
  {
    icon: '📞',
    name: 'AKAI Sales',
    status: 'live' as const,
    tagline: 'AI finds leads, calls them, books meetings',
    features: ['Sophie AI voice calling', 'Lead enrichment', 'Auto-booking', 'Call recordings + transcripts'],
    price: '$297/mo',
  },
  {
    icon: '🎯',
    name: 'AKAI Recruit',
    status: 'building' as const,
    tagline: 'AI sources candidates and books interviews',
    features: ['Job posting AI', 'Candidate scoring', 'AI screening calls', 'Calendar integration'],
    price: '$247/mo',
  },
  {
    icon: '🌐',
    name: 'AKAI Web',
    status: 'building' as const,
    tagline: 'AI builds and runs your website via chat',
    features: ['Chat-to-website', 'SEO optimised', 'Lead capture forms', 'Auto-updates via chat'],
    price: '$197/mo',
  },
  {
    icon: '📣',
    name: 'AKAI Ads',
    status: 'planned' as const,
    tagline: 'Google + Meta ads managed by AI',
    features: ['AI copywriting', 'Budget optimisation', 'A/B testing', 'ROI tracking'],
    price: '$397/mo',
  },
  {
    icon: '📱',
    name: 'AKAI Social',
    status: 'planned' as const,
    tagline: 'Instagram + LinkedIn content automation',
    features: ['AI content calendar', 'Auto-publishing', 'Engagement tracking', 'Brand voice matching'],
    price: '$147/mo',
  },
];

const STATUS_LABELS = {
  live: { label: '✅ Live', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
  building: { label: '🚧 Building', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  planned: { label: '📋 Planned', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

export default function Modules() {
  return (
    <section id="modules" className="py-24 px-6 border-t border-[#1f1f1f]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            One platform. <span className="text-[#D4AF37]">Every function.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Each AKAI module is a complete AI-powered business function. Use one or combine all five.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.map(mod => {
            const status = STATUS_LABELS[mod.status];
            return (
              <div key={mod.name} className="p-6 bg-[#111] border border-[#1f1f1f] rounded-2xl hover:border-[#D4AF37]/30 transition-colors flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{mod.icon}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <h3 className="font-bold text-lg mb-1">{mod.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{mod.tagline}</p>

                <ul className="space-y-2 flex-1">
                  {mod.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-[#D4AF37] text-xs">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-4 border-t border-[#1f1f1f] flex items-center justify-between">
                  <span className="font-bold text-white">{mod.price}</span>
                  {mod.status === 'live' ? (
                    <a href="/onboard" className="text-sm text-[#D4AF37] hover:underline font-medium">
                      Get started →
                    </a>
                  ) : (
                    <span className="text-xs text-gray-600">Coming soon</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
