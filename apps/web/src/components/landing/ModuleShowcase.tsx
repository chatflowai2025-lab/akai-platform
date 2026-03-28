const SHOWCASE_MODULES = [
  {
    emoji: '📧',
    name: 'Email Guard',
    description: 'Reads every enquiry, writes every proposal',
    href: '/email-guard',
  },
  {
    emoji: '📞',
    name: 'Sales',
    description: 'Sophie calls your leads instantly',
    href: '/sales',
  },
  {
    emoji: '📅',
    name: 'Calendar',
    description: 'Books meetings without the back-and-forth',
    href: '/calendar',
  },
  {
    emoji: '👤',
    name: 'Recruit',
    description: 'AI-screens candidates in seconds',
    href: '/recruit',
  },
  {
    emoji: '📢',
    name: 'Ads',
    description: 'Writes and launches Google Ads campaigns',
    href: '/ads',
  },
  {
    emoji: '📱',
    name: 'Social',
    description: 'Creates and schedules content automatically',
    href: '/social',
  },
];

export default function ModuleShowcase() {
  return (
    <section className="relative py-20 px-6">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight text-white">
            Everything your business needs.{' '}
            <span className="text-[#D4AF37]">All in one place.</span>
          </h2>
          <p className="text-white/40 text-base max-w-xl mx-auto">
            10 AI-powered modules working together to find, convert, and retain your customers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SHOWCASE_MODULES.map(mod => (
            <a
              key={mod.name}
              href={mod.href}
              className="group relative flex flex-col gap-3 rounded-2xl p-5 border border-[#1f1f1f] transition-all duration-200 hover:-translate-y-1 hover:border-[#D4AF37]/30 hover:shadow-lg hover:shadow-[#D4AF37]/[0.06]"
              style={{ background: '#111' }}
            >
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#D4AF37]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(212,175,55,0.12)' }}
              >
                {mod.emoji}
              </div>

              {/* Content */}
              <div>
                <h3 className="font-bold text-white text-base mb-1">{mod.name}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {mod.description}
                </p>
              </div>

              {/* Arrow */}
              <div
                className="mt-auto text-xs font-semibold flex items-center gap-1 transition-colors group-hover:text-[#D4AF37]"
                style={{ color: 'rgba(212,175,55,0.5)' }}
              >
                Explore
                <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
              </div>
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-bold text-base text-black transition-all hover:opacity-90 shadow-lg shadow-[#D4AF37]/20"
            style={{ background: '#D4AF37' }}
          >
            Start for free — no credit card required
          </a>
          <a
            href="/she-demo"
            className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-semibold text-base border border-white/20 text-white/70 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all"
          >
            See how it works →
          </a>
        </div>
      </div>
    </section>
  );
}
