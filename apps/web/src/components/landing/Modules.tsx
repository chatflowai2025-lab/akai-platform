'use client';

interface Module {
  emoji: string;
  name: string;
  benefit: string;
  href: string;
}

const MODULES: Module[] = [
  {
    emoji: '📞',
    name: 'Sales',
    benefit: 'Converts leads to meetings — automatically',
    href: '/sales',
  },
  {
    emoji: '🎙️',
    name: 'Voice',
    benefit: 'AI calls your prospects in under 60 seconds',
    href: '/voice',
  },
  {
    emoji: '📧',
    name: 'Email Guard',
    benefit: 'AI triages your inbox and sends proposals',
    href: '/email-guard',
  },
  {
    emoji: '📅',
    name: 'Calendar',
    benefit: 'Books meetings automatically — no back-and-forth',
    href: '/calendar',
  },
  {
    emoji: '📢',
    name: 'Ads',
    benefit: 'Manages your Google Ads like a $150k/yr buyer',
    href: '/ads',
  },
  {
    emoji: '📱',
    name: 'Social',
    benefit: 'Creates and schedules content across every platform',
    href: '/social',
  },
  {
    emoji: '👤',
    name: 'Recruit',
    benefit: 'Screens candidates and gives you a shortlist',
    href: '/recruit',
  },
  {
    emoji: '🌐',
    name: 'Web',
    benefit: 'Audits and improves your site for conversions',
    href: '/web',
  },
  {
    emoji: '💊',
    name: 'Health',
    benefit: 'Monitors everything and flags issues early',
    href: '/health',
  },
];

function ModuleCard({ mod }: { mod: Module }) {
  return (
    <a
      href={mod.href}
      className="group relative block bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:border-[#D4AF37]/50 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(212,175,55,0.10)]"
    >
      {/* Gold glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/0 to-[#D4AF37]/0 group-hover:from-[#D4AF37]/[0.04] group-hover:to-transparent transition-all duration-300 pointer-events-none rounded-2xl" />

      {/* Top row: icon + Live badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-2xl group-hover:border-[#D4AF37]/40 transition-colors duration-300">
          {mod.emoji}
        </div>
        <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-[10px] font-bold uppercase tracking-wide">Live</span>
        </div>
      </div>

      {/* Name */}
      <h3 className="text-white font-bold text-lg mb-1.5 group-hover:text-[#D4AF37] transition-colors duration-200">
        {mod.name}
      </h3>

      {/* 1-line benefit */}
      <p className="text-gray-500 text-sm leading-relaxed">
        {mod.benefit}
      </p>

      {/* Arrow */}
      <div className="absolute bottom-5 right-5 text-gray-700 group-hover:text-[#D4AF37] transition-all duration-200 group-hover:translate-x-0.5">
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
            9 AI agents · One platform
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Every business function.{' '}
            <span className="text-[#D4AF37]">Fully automated.</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Each agent runs independently or together — and every one learns from the others.
          </p>
        </div>

        {/* 3-column grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map(mod => (
            <ModuleCard key={mod.name} mod={mod} />
          ))}
        </div>
      </div>
    </section>
  );
}
