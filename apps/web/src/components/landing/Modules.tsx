'use client';

interface Module {
  emoji: string;
  name: string;
  description: string;
  badge: string;
  href: string;
}

const MODULES: Module[] = [
  {
    emoji: '📧',
    name: 'Email Guard',
    description: 'Reads every enquiry, writes every proposal',
    badge: 'Adaptive templates',
    href: '/email-guard',
  },
  {
    emoji: '📞',
    name: 'Sales',
    description: 'Sophie calls your leads in 60 seconds',
    badge: 'Autonomous follow-ups',
    href: '/sales',
  },
  {
    emoji: '📅',
    name: 'Calendar',
    description: 'Books meetings without the back-and-forth',
    badge: 'Real availability sync',
    href: '/calendar',
  },
  {
    emoji: '👤',
    name: 'Recruit',
    description: 'AI screens & scores every candidate',
    badge: '0-100 scoring',
    href: '/recruit',
  },
  {
    emoji: '📢',
    name: 'Ads',
    description: 'Writes and launches Google Ads campaigns',
    badge: 'Campaign tracking',
    href: '/ads',
  },
  {
    emoji: '📱',
    name: 'Social',
    description: 'Creates and schedules content',
    badge: 'Multi-platform',
    href: '/social',
  },
  {
    emoji: '🎙️',
    name: 'Voice',
    description: 'AI voice agent handles inbound calls',
    badge: 'Natural conversation',
    href: '/voice',
  },
  {
    emoji: '🌐',
    name: 'Web',
    description: 'Audits your site and fixes what costs you leads',
    badge: 'Conversion optimised',
    href: '/web',
  },
  {
    emoji: '📄',
    name: 'Proposals',
    description: 'Generates tailored proposals in seconds',
    badge: 'Auto-personalised',
    href: '/proposals',
  },
  {
    emoji: '💊',
    name: 'Health',
    description: 'Monitors business vitals and flags issues early',
    badge: 'Daily report',
    href: '/health',
  },
];

function ModuleCard({ mod }: { mod: Module }) {
  return (
    <a
      href={mod.href}
      className="group relative block bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:border-[#D4AF37]/40 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(212,175,55,0.08)]"
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/0 to-[#D4AF37]/0 group-hover:from-[#D4AF37]/[0.03] group-hover:to-transparent transition-all duration-300 pointer-events-none rounded-2xl" />

      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-2xl mb-4 group-hover:border-[#D4AF37]/30 transition-colors duration-300">
        {mod.emoji}
      </div>

      {/* Name */}
      <h3 className="text-white font-bold text-lg mb-1 group-hover:text-[#D4AF37] transition-colors duration-200">
        {mod.name}
      </h3>

      {/* Description */}
      <p className="text-gray-500 text-sm leading-relaxed mb-4">
        {mod.description}
      </p>

      {/* Smart feature badge */}
      <div className="inline-flex items-center gap-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full px-3 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
        <span className="text-[#D4AF37] text-xs font-semibold">{mod.badge}</span>
      </div>

      {/* Arrow */}
      <div className="absolute top-6 right-6 text-gray-600 group-hover:text-[#D4AF37] transition-all duration-200 group-hover:translate-x-0.5">
        →
      </div>
    </a>
  );
}

export default function Modules() {
  return (
    <section id="modules" className="relative py-24 px-6">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-[#D4AF37] text-sm font-semibold uppercase tracking-widest mb-3">
            10 AI agents · One platform
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Every business function.{' '}
            <span className="text-[#D4AF37]">Fully automated.</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Each agent runs independently or together — and every one learns from the others.
          </p>
        </div>

        {/* 6-card grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map(mod => (
            <ModuleCard key={mod.name} mod={mod} />
          ))}
        </div>
      </div>
    </section>
  );
}
