const STEPS = [
  {
    number: '01',
    title: 'Describe your business',
    description: 'Tell AK your industry, goals, and who you sell to. Plain English. Two minutes.',
    accent: 'from-[#F59E0B]/20 to-transparent',
  },
  {
    number: '02',
    title: 'AKAI builds your stack',
    description: 'We configure your website, lead pipeline, calling system, and selected modules automatically.',
    accent: 'from-[#D4AF37]/20 to-transparent',
  },
  {
    number: '03',
    title: 'AI runs it 24/7',
    description: 'Sophie calls your leads. Your site converts visitors. Reports hit your dashboard every morning.',
    accent: 'from-[#F59E0B]/20 to-transparent',
  },
  {
    number: '04',
    title: 'You close and collect',
    description: 'Calendar invites land for booked meetings. You show up, close the deal, invoice.',
    accent: 'from-[#D4AF37]/20 to-transparent',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32 px-6 overflow-hidden">
      {/* Subtle divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
            From zero to running{' '}
            <span className="gradient-text">in 2 minutes</span>
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            No developers. No agencies. No waiting.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="relative glass card-hover rounded-2xl p-8 overflow-hidden group"
            >
              {/* Background accent */}
              <div className={`absolute inset-0 bg-gradient-to-br ${step.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

              {/* Content */}
              <div className="relative">
                <div className="text-[11px] font-black text-[#D4AF37]/50 tracking-[0.2em] uppercase mb-4">
                  Step {step.number}
                </div>
                <h3 className="font-bold text-lg mb-2 text-white">{step.title}</h3>
                <p className="text-white/40 leading-relaxed text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
