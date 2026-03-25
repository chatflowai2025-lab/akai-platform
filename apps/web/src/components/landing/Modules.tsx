// SVG icon components — clean, modern, no emoji
function SalesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .98h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );
}
function RecruitIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function WebIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  );
}
function AdsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  );
}
function SocialIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  );
}

const MODULES = [
  {
    Icon: SalesIcon,
    name: 'AKAI Sales',
    status: 'live' as const,
    tagline: 'AI finds leads, calls them, books meetings in your calendar.',
    features: ['Sophie AI voice calling', 'Lead enrichment', 'Auto-booking', 'Call recordings'],
    price: '$297',
  },
  {
    Icon: RecruitIcon,
    name: 'AKAI Recruit',
    status: 'building' as const,
    tagline: 'AI sources candidates, screens them, books interviews.',
    features: ['Job posting AI', 'Candidate scoring', 'AI screening calls', 'Calendar integration'],
    price: '$247',
  },
  {
    Icon: WebIcon,
    name: 'AKAI Web',
    status: 'building' as const,
    tagline: 'AI builds and updates your website through chat.',
    features: ['Chat-to-website', 'SEO optimised', 'Lead capture', 'Auto-updates via chat'],
    price: '$197',
  },
  {
    Icon: AdsIcon,
    name: 'AKAI Ads',
    status: 'planned' as const,
    tagline: 'Google + Meta campaigns planned, launched, and optimised by AI.',
    features: ['AI copywriting', 'Budget optimisation', 'A/B testing', 'ROI tracking'],
    price: '$397',
  },
  {
    Icon: SocialIcon,
    name: 'AKAI Social',
    status: 'planned' as const,
    tagline: 'Instagram + LinkedIn content calendar, created and published automatically.',
    features: ['AI content calendar', 'Auto-publishing', 'Engagement tracking', 'Brand voice'],
    price: '$147',
  },
];

const STATUS = {
  live: { label: 'Live', dot: 'bg-green-400', text: 'text-green-400' },
  building: { label: 'Building', dot: 'bg-amber-400', text: 'text-amber-400' },
  planned: { label: 'Planned', dot: 'bg-white/20', text: 'text-white/30' },
};

export default function Modules() {
  return (
    <section id="modules" className="relative py-32 px-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-white/40 uppercase tracking-widest mb-6">
            Modules
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
            One platform.{' '}
            <span className="gradient-text">Every function.</span>
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Each module is a complete AI-powered business function. Use one or combine all five.
          </p>
        </div>

        {/* 5-card grid: 3 on top, 2 centered on bottom */}
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {MODULES.slice(0, 3).map(mod => (
            <ModuleCard key={mod.name} mod={mod} />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4 md:mx-[calc(100%/6)]">
          {MODULES.slice(3).map(mod => (
            <ModuleCard key={mod.name} mod={mod} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ModuleCard({ mod }: { mod: typeof MODULES[0] }) {
  const { Icon } = mod;
  const status = STATUS[mod.status];
  const isLive = mod.status === 'live';

  return (
    <div className={`relative glass card-hover rounded-2xl p-6 flex flex-col overflow-hidden ${isLive ? 'border-gradient' : ''}`}>
      {/* Live glow */}
      {isLive && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/[0.04] to-transparent pointer-events-none" />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between mb-5 relative">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLive ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-white/[0.04] text-white/30'}`}>
          <Icon />
        </div>

        {/* Status pill */}
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${isLive ? 'pulse-ring' : ''}`} />
          <span className={`text-xs font-medium ${status.text}`}>{status.label}</span>
        </div>
      </div>

      {/* Name & tagline */}
      <h3 className="font-bold text-base mb-1 text-white relative">{mod.name}</h3>
      <p className="text-white/40 text-sm mb-5 leading-relaxed relative flex-1">{mod.tagline}</p>

      {/* Features */}
      <ul className="space-y-2 mb-6 relative">
        {mod.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-white/50">
            <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isLive ? 'bg-[#D4AF37]' : 'bg-white/20'}`} />
            {f}
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="relative flex items-center justify-between pt-4 border-t border-white/[0.06]">
        <div>
          <span className={`text-xl font-black ${isLive ? 'text-white' : 'text-white/30'}`}>
            {mod.price}
          </span>
          <span className={`text-xs ml-1 ${isLive ? 'text-white/40' : 'text-white/20'}`}>/mo</span>
        </div>
        {isLive ? (
          <a
            href="/onboard"
            className="text-sm font-semibold text-[#D4AF37] hover:text-[#F59E0B] transition-colors flex items-center gap-1 group"
          >
            Get started
            <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
          </a>
        ) : (
          <span className="text-xs text-white/20">Coming soon</span>
        )}
      </div>
    </div>
  );
}
