export const dynamic = 'force-dynamic';

import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import Button from '@/components/ui/Button';

// SVG icons
function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
      <path d="M19 10v2a7 7 0 01-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

const HOW_IT_WORKS = [
  {
    number: '01',
    title: 'Set your brand voice',
    description: 'Tell AKAI your tone, industry, and audience. Once. It remembers everything.',
    accent: 'from-[#F59E0B]/20 to-transparent',
  },
  {
    number: '02',
    title: 'AI generates content',
    description: 'Get a full 30-day content calendar with captions, hashtags, and posting times — tailored to your brand.',
    accent: 'from-[#D4AF37]/20 to-transparent',
  },
  {
    number: '03',
    title: 'Auto-publishes for you',
    description: 'Posts go live on Instagram and LinkedIn at peak engagement times. You watch the likes roll in.',
    accent: 'from-[#F59E0B]/20 to-transparent',
  },
];

const FEATURES = [
  {
    Icon: InstagramIcon,
    title: 'Instagram + LinkedIn',
    description: 'Native publishing to both platforms. Right format, right size, right time — always.',
  },
  {
    Icon: MicIcon,
    title: 'Brand voice matching',
    description: 'AI learns how you talk. Every post sounds like you wrote it — because you trained it.',
  },
  {
    Icon: CalendarIcon,
    title: '30-day content calendar',
    description: 'A full month of content, planned and scheduled in minutes. Never scramble for a post again.',
  },
  {
    Icon: BarChartIcon,
    title: 'Engagement tracking',
    description: 'See likes, comments, reach, and follower growth — all in one dashboard.',
  },
  {
    Icon: SparkleIcon,
    title: 'AI caption generation',
    description: 'Hooks, body copy, CTAs, hashtags. The full post, not just an idea.',
  },
  {
    Icon: SendIcon,
    title: 'Auto-publishing',
    description: 'Set it and forget it. Posts go live at the best time for your audience.',
  },
];

const SAMPLE_POSTS = [
  {
    platform: 'Instagram',
    Icon: InstagramIcon,
    day: 'Mon',
    caption: '3 things your competitors are doing on social that you\'re not. 🧵',
    time: '9:00 AM',
  },
  {
    platform: 'LinkedIn',
    Icon: LinkedInIcon,
    day: 'Wed',
    caption: 'We grew our inbound leads 340% in 90 days. Here\'s the exact content strategy we used.',
    time: '8:30 AM',
  },
  {
    platform: 'Instagram',
    Icon: InstagramIcon,
    day: 'Fri',
    caption: 'Behind the scenes: what a week running an AI-powered business actually looks like. 👀',
    time: '11:00 AM',
  },
];

export default function SocialPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden dot-grid">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#D4AF37]/[0.05] rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-[#F59E0B]/[0.04] rounded-full blur-[80px]" />
        </div>

        {/* Badge */}
        <div className="fade-up fade-up-1 inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-[#F59E0B] mb-8">
          <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
          <span>AKAI Social</span>
          <span className="w-px h-3 bg-white/10" />
          <span className="text-white/50">Instagram + LinkedIn on autopilot</span>
        </div>

        {/* Headline */}
        <h1 className="fade-up fade-up-2 text-5xl md:text-7xl font-black mb-6 leading-[0.95] tracking-tight max-w-4xl">
          Your content calendar,
          <br />
          <span className="gradient-text">on autopilot.</span>
        </h1>

        {/* Subheadline */}
        <p className="fade-up fade-up-3 text-xl text-white/40 max-w-xl mb-10 leading-relaxed">
          AI writes your posts, schedules them, and publishes them — while you focus on running your business.
        </p>

        {/* CTA */}
        <div className="fade-up fade-up-4 flex flex-col sm:flex-row gap-4 items-center">
          <Button href="/onboard" size="lg" className="glow-gold-sm min-w-[200px]">
            Start Posting →
          </Button>
          <Button href="#how-it-works" variant="ghost" size="lg">
            See how it works
          </Button>
        </div>

        {/* Platform pills */}
        <div className="fade-up fade-up-4 flex items-center gap-3 mt-10 text-sm text-white/40">
          <span className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-[#D4AF37]">
            <InstagramIcon /> Instagram
          </span>
          <span className="text-white/20">+</span>
          <span className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-[#D4AF37]">
            <LinkedInIcon /> LinkedIn
          </span>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
              Three steps to{' '}
              <span className="gradient-text">consistent content</span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Set it up once. AKAI posts for you every day.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.number}
                className="relative glass card-hover rounded-2xl p-8 overflow-hidden group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${step.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
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

      {/* ── Sample Calendar Preview ────────────────────────────────────── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
              Your{' '}
              <span className="gradient-text">30-day calendar</span>
              {' '}— built in seconds
            </h2>
            <p className="text-white/40 max-w-md mx-auto">
              A preview of what AKAI Social generates for you automatically.
            </p>
          </div>

          {/* Calendar card */}
          <div className="glass border-gradient rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="font-bold text-white">Content Calendar</h3>
                <p className="text-white/40 text-sm">This week&apos;s scheduled posts</p>
              </div>
              <div className="flex items-center gap-2 text-[#D4AF37] text-sm">
                <CalendarIcon />
                <span>3 posts scheduled</span>
              </div>
            </div>

            <div className="space-y-3">
              {SAMPLE_POSTS.map((post, i) => {
                const { Icon } = post;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-4 glass rounded-xl p-4 group card-hover"
                  >
                    {/* Day */}
                    <div className="flex-shrink-0 w-10 text-center">
                      <div className="text-[11px] text-white/30 uppercase tracking-wider">{post.day}</div>
                    </div>

                    {/* Platform icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
                      <Icon />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white/80 line-clamp-1">{post.caption}</div>
                      <div className="text-xs text-white/30 mt-0.5">{post.platform} · {post.time}</div>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                      <span className="text-xs text-[#D4AF37]">Scheduled</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ─────────────────────────────────────────────── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
              Everything you need to{' '}
              <span className="gradient-text">own your feed</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((feature) => {
              const { Icon } = feature;
              return (
                <div key={feature.title} className="glass card-hover rounded-2xl p-6 group">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center mb-4 group-hover:bg-[#D4AF37]/20 transition-colors">
                    <Icon />
                  </div>
                  <h3 className="font-bold text-base mb-2 text-white">{feature.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#D4AF37]/[0.04] rounded-full blur-[100px]" />
        </div>

        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
            Stop scrambling for content.
            <br />
            <span className="gradient-text">Start growing.</span>
          </h2>
          <p className="text-white/40 text-lg mb-10 leading-relaxed">
            AKAI Social handles your content calendar so you can focus on what you&apos;re actually good at.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/onboard" size="lg" className="glow-gold-sm min-w-[200px]">
              Start Posting →
            </Button>
            <Button href="/#modules" variant="secondary" size="lg">
              See all modules
            </Button>
          </div>
          <p className="text-white/20 text-sm mt-6">$147/mo · Cancel anytime · Posts go live within 48h</p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
