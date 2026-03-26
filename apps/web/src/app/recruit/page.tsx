'use client';

export const dynamic = 'force-dynamic';

import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import Button from '@/components/ui/Button';

// ── Icons ──────────────────────────────────────────────────────────────────

function BriefcaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

function PhoneCallIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .98h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
      <path d="M14.05 2a9 9 0 018 7.94"/>
      <path d="M14.05 6A5 5 0 0120 11"/>
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

function XCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    number: '01',
    title: 'Post the role',
    description: 'Describe the position in plain English. AKAI writes the job post, targets the right candidates, and distributes across channels — automatically.',
    accent: 'from-[#F59E0B]/20 to-transparent',
  },
  {
    number: '02',
    title: 'AI screens candidates',
    description: 'Every applicant gets scored, ranked, and screened via AI voice call. AKAI asks the right questions and surfaces the best fits — 24/7, no recruiter required.',
    accent: 'from-[#D4AF37]/20 to-transparent',
  },
  {
    number: '03',
    title: 'Book interviews',
    description: 'Top candidates are automatically booked into your calendar. You only meet people worth meeting.',
    accent: 'from-[#F59E0B]/20 to-transparent',
  },
];

interface Feature {
  Icon: () => JSX.Element;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    Icon: BriefcaseIcon,
    title: 'AI job posting',
    description: 'Describe the role once. AKAI writes compelling job ads optimised for each platform — LinkedIn, Indeed, and beyond.',
  },
  {
    Icon: StarIcon,
    title: 'Candidate scoring',
    description: 'Every applicant is scored 0–100 against your requirements. No more reading 200 resumes.',
  },
  {
    Icon: PhoneCallIcon,
    title: 'AI screening calls',
    description: 'AKAI\'s voice AI calls candidates, asks qualifying questions, and produces a full transcript with recommendation.',
  },
  {
    Icon: CalendarIcon,
    title: 'Calendar integration',
    description: 'Top candidates are automatically booked into available slots — no back-and-forth scheduling.',
  },
  {
    Icon: XCircleIcon,
    title: 'Rejection handling',
    description: 'Unsuccessful candidates receive a professional, empathetic rejection — automatically. Your brand stays intact.',
  },
  {
    Icon: UsersIcon,
    title: 'Talent pipeline',
    description: 'Every candidate is stored and scored. Reopen a role? AKAI already knows who to call first.',
  },
];

type CandidateStatus = 'Interview booked' | 'Under review' | 'Screening call done';

interface Candidate {
  name: string;
  role: string;
  score: number;
  status: CandidateStatus;
  initials: string;
}

const MOCK_CANDIDATES: Candidate[] = [
  {
    name: 'Sarah Chen',
    role: 'Senior Product Manager',
    score: 94,
    status: 'Interview booked',
    initials: 'SC',
  },
  {
    name: 'Marcus Williams',
    role: 'Senior Product Manager',
    score: 81,
    status: 'Screening call done',
    initials: 'MW',
  },
  {
    name: 'Priya Patel',
    role: 'Senior Product Manager',
    score: 76,
    status: 'Under review',
    initials: 'PP',
  },
];

const STATUS_STYLES: Record<CandidateStatus, { dot: string; text: string; label: string }> = {
  'Interview booked': { dot: 'bg-[#D4AF37]', text: 'text-[#D4AF37]', label: 'Interview booked' },
  'Screening call done': { dot: 'bg-green-400', text: 'text-green-400', label: 'Screening call done' },
  'Under review': { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Under review' },
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function RecruitPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden dot-grid">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#D4AF37]/[0.05] rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-[#F59E0B]/[0.04] rounded-full blur-[80px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[250px] h-[250px] bg-[#D4AF37]/[0.03] rounded-full blur-[60px]" />
        </div>

        {/* Badge */}
        <div className="fade-up fade-up-1 inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-[#F59E0B] mb-8">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>AKAI Recruit</span>
          <span className="w-px h-3 bg-white/10" />
          <span className="text-white/50">AI-powered hiring — now building</span>
        </div>

        {/* Headline */}
        <h1 className="fade-up fade-up-2 text-5xl md:text-7xl font-black mb-6 leading-[0.95] tracking-tight max-w-4xl">
          Hire faster.{' '}
          <span className="gradient-text">Screen smarter.</span>
          <br />
          Close the best candidates first.
        </h1>

        {/* Subheadline */}
        <p className="fade-up fade-up-3 text-xl text-white/40 max-w-xl mb-10 leading-relaxed">
          AKAI sources candidates, scores their fit, runs AI screening calls, and books
          interviews into your calendar — while you focus on running your business.
        </p>

        {/* CTA */}
        <div className="fade-up fade-up-4 flex flex-col sm:flex-row gap-4 items-center">
          <Button href="/onboard" size="lg" className="glow-gold-sm min-w-[220px]">
            Get Early Access →
          </Button>
          <Button href="#how-it-works" variant="ghost" size="lg">
            See how it works
          </Button>
        </div>

        {/* Stats bar */}
        <div className="fade-up fade-up-4 w-full max-w-2xl mt-14">
          <div className="glass rounded-2xl px-8 py-5 grid grid-cols-3 divide-x divide-white/[0.06]">
            <div className="flex flex-col items-center gap-1 px-4">
              <span className="text-3xl font-black gradient-text tracking-tight">-70%</span>
              <span className="text-xs text-white/40 uppercase tracking-wider">Time-to-hire</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-4">
              <span className="text-3xl font-black text-white tracking-tight">24/7</span>
              <span className="text-xs text-white/40 uppercase tracking-wider">Screening</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-4">
              <span className="text-3xl font-black gradient-text tracking-tight">10x</span>
              <span className="text-xs text-white/40 uppercase tracking-wider">Pipeline</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
              Three steps to{' '}
              <span className="gradient-text">your next great hire</span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              No recruiters. No spreadsheets. No scheduling hell.
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

      {/* ── Features Grid ─────────────────────────────────────────────── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
              Everything you need to{' '}
              <span className="gradient-text">hire without the hustle</span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              A full recruiting machine — from job post to signed offer.
            </p>
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

      {/* ── 30-day Pipeline Preview ───────────────────────────────────── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
              Your{' '}
              <span className="gradient-text">30-day pipeline</span>
              {' '}— on autopilot
            </h2>
            <p className="text-white/40 max-w-md mx-auto">
              A preview of what AKAI Recruit surfaces for you automatically.
            </p>
          </div>

          {/* Pipeline card */}
          <div className="glass border-gradient rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="font-bold text-white">Candidate Pipeline</h3>
                <p className="text-white/40 text-sm">Senior Product Manager · 3 top candidates</p>
              </div>
              <div className="flex items-center gap-2 text-[#D4AF37] text-sm">
                <UsersIcon />
                <span>AI-ranked</span>
              </div>
            </div>

            <div className="space-y-3">
              {MOCK_CANDIDATES.map((candidate, i) => {
                const statusStyle = STATUS_STYLES[candidate.status];
                const scoreColor =
                  candidate.score >= 90
                    ? 'text-[#D4AF37]'
                    : candidate.score >= 75
                    ? 'text-green-400'
                    : 'text-amber-400';

                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 glass rounded-xl p-4 group card-hover"
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-6 text-center">
                      <span className="text-xs text-white/20 font-bold">#{i + 1}</span>
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center text-xs font-black">
                      {candidate.initials}
                    </div>

                    {/* Name + role */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">{candidate.name}</div>
                      <div className="text-xs text-white/40">{candidate.role}</div>
                    </div>

                    {/* Score */}
                    <div className="flex-shrink-0 text-center">
                      <div className={`text-lg font-black ${scoreColor}`}>{candidate.score}</div>
                      <div className="text-[10px] text-white/30 uppercase tracking-wider">score</div>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      <span className={`text-xs ${statusStyle.text} hidden sm:block`}>
                        {statusStyle.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pipeline footer */}
            <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-sm text-white/30">
              <span>28 applicants screened by AI</span>
              <span className="text-[#D4AF37]">3 advancing →</span>
            </div>
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
            Stop losing top candidates
            <br />
            <span className="gradient-text">to slow hiring.</span>
          </h2>
          <p className="text-white/40 text-lg mb-10 leading-relaxed">
            The best candidates are off the market in 10 days. AKAI moves faster than any recruiter — and never sleeps.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/onboard" size="lg" className="glow-gold min-w-[220px]">
              Start Hiring Smarter →
            </Button>
            <Button href="/#modules" variant="secondary" size="lg">
              See all modules
            </Button>
          </div>
          <p className="text-white/20 text-sm mt-6">$247/mo · Cancel anytime · Early access pricing</p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
