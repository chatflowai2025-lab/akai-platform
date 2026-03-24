const STEPS = [
  {
    number: '01',
    title: 'Describe your business',
    description: 'Tell MM (your AI partner) about your business in plain English. Industry, goals, who you sell to.',
  },
  {
    number: '02',
    title: 'AKAI builds your stack',
    description: 'We set up your website, lead pipeline, calling system, and all modules based on what you need.',
  },
  {
    number: '03',
    title: 'AI runs it 24/7',
    description: 'Sophie calls your leads. Your site converts visitors. Reports land in your dashboard every morning.',
  },
  {
    number: '04',
    title: 'You close and collect',
    description: 'You get calendar invites for booked meetings. You show up, close the deal, and invoice.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-[#1f1f1f]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            From zero to running <span className="text-[#D4AF37]">in 2 minutes</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            No developers. No agencies. No waiting. Just describe your business and watch it go live.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {STEPS.map(step => (
            <div key={step.number} className="flex gap-6 p-6 bg-[#111] border border-[#1f1f1f] rounded-2xl hover:border-[#D4AF37]/30 transition-colors">
              <div className="text-3xl font-black text-[#D4AF37]/30 font-mono w-12 flex-shrink-0">
                {step.number}
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
