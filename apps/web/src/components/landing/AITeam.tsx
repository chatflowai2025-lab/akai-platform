'use client';

import { useState } from 'react';

const AGENTS = [
  {
    role: 'CEO',
    icon: '👔',
    color: 'from-yellow-500/20 to-amber-500/20',
    border: 'border-yellow-500/20',
    accent: 'text-yellow-400',
    what: 'Sets the direction, coordinates the team, and makes sure every agent is pulling toward one goal — your growth.',
    does: ['Defines weekly goals', 'Routes work to the right agents', 'Reviews results and adjusts'],
  },
  {
    role: 'COO',
    icon: '⚙️',
    color: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/20',
    accent: 'text-blue-400',
    what: 'The one who keeps the machine running. Nothing slips, nothing waits, nothing breaks twice.',
    does: ['Monitors all active tasks', 'Escalates blockers to you', 'Manages delivery timelines'],
  },
  {
    role: 'CMO',
    icon: '📣',
    color: 'from-pink-500/20 to-rose-500/20',
    border: 'border-pink-500/20',
    accent: 'text-pink-400',
    what: 'Builds your brand, writes your outreach, and runs your campaigns — generating demand while you do literally anything else.',
    does: ['Writes outreach emails', 'Creates social content', 'Runs ad campaigns'],
  },
  {
    role: 'Sales',
    icon: '📞',
    color: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/20',
    accent: 'text-green-400',
    what: 'Finds leads, writes the pitch, books the meeting. While you sleep.',
    does: ['Outbound calling via Sophie', 'Lead qualification', 'Meeting booking'],
  },
  {
    role: 'Recruiter',
    icon: '🎯',
    color: 'from-purple-500/20 to-violet-500/20',
    border: 'border-purple-500/20',
    accent: 'text-purple-400',
    what: 'Reads every CV so you don\'t have to. Scores them 0–100, shortlists the best, and schedules interviews automatically.',
    does: ['AI candidate screening', 'Job description writing', 'Interview scheduling'],
  },
  {
    role: 'Finance',
    icon: '💰',
    color: 'from-amber-500/20 to-yellow-500/20',
    border: 'border-amber-500/20',
    accent: 'text-[#D4AF37]',
    what: 'Your CFO without the corner office. Tracks every dollar, flags margin risks, and keeps the books honest.',
    does: ['Revenue tracking', 'Invoice generation', 'Margin analysis'],
  },
  {
    role: 'Web',
    icon: '🌐',
    color: 'from-sky-500/20 to-blue-500/20',
    border: 'border-sky-500/20',
    accent: 'text-sky-400',
    what: 'Audits your site, rewrites the copy, fixes the leaks. No agency invoice at the end.',
    does: ['SEO & conversion audit', 'AI copywriting', 'Website builder'],
  },
  {
    role: 'Social',
    icon: '📱',
    color: 'from-orange-500/20 to-red-500/20',
    border: 'border-orange-500/20',
    accent: 'text-orange-400',
    what: 'Posts to Instagram, LinkedIn, Facebook, and X — every day, on brand, without you writing a single word.',
    does: ['4-platform content generation', 'Brand voice consistency', 'Scheduling'],
  },
  {
    role: 'Account Manager',
    icon: '🤝',
    color: 'from-teal-500/20 to-cyan-500/20',
    border: 'border-teal-500/20',
    accent: 'text-teal-400',
    what: 'Keeps every client happy, informed, and coming back — without you having to chase anyone.',
    does: ['Client communications', 'Proposal generation', 'Relationship tracking'],
  },
  {
    role: 'Email Guard',
    icon: '📧',
    color: 'from-indigo-500/20 to-blue-500/20',
    border: 'border-indigo-500/20',
    accent: 'text-indigo-400',
    what: 'Reads every enquiry, writes the proposal, sends it — before you\'ve even seen the email.',
    does: ['Inbox monitoring', 'Instant proposal generation', 'Follow-up sequences'],
  },
];

export default function AITeam() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section className="py-24 px-6 bg-[#0a0a0a] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/3 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-semibold mb-6">
            ✦ Your AI Business Team
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            10 specialists.<br />
            <span className="text-[#D4AF37]">No hiring.</span>
          </h2>
          <p className="text-gray-400 mt-4 text-lg max-w-2xl mx-auto leading-relaxed">
            Describe your business once. Your AI team handles sales, marketing, ops, web, social, and more — 24 hours a day, 7 days a week.
          </p>
          <p className="text-gray-600 mt-3 text-sm">
            While others build agent frameworks, AKAI gives you the team — already assembled, already specialised.
          </p>
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {AGENTS.map((agent, i) => (
            <div
              key={agent.role}
              onClick={() => setActive(active === i ? null : i)}
              className={`relative rounded-2xl border p-5 cursor-pointer transition-all duration-200 bg-gradient-to-br ${agent.color} ${agent.border} hover:scale-[1.02] ${active === i ? 'ring-1 ring-[#D4AF37]/40 scale-[1.02]' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{agent.icon}</div>
                  <div>
                    <p className={`font-black text-sm ${agent.accent}`}>{agent.role}</p>
                    <p className="text-white/60 text-xs">AI Agent</p>
                  </div>
                </div>
                <span className="text-gray-600 text-xs">{active === i ? '▲' : '▾'}</span>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed">{agent.what}</p>

              {active === i && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">What they do daily</p>
                  <ul className="space-y-1.5">
                    {agent.does.map((d, j) => (
                      <li key={j} className="flex items-center gap-2 text-xs text-gray-300">
                        <span className={`w-1 h-1 rounded-full flex-shrink-0 bg-current ${agent.accent}`} />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comparison callout */}
        <div className="relative rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-r from-[#D4AF37]/5 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-white font-black text-lg mb-1">The difference is simple.</p>
            <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
              Other tools give you agent <em>frameworks</em> — you still build, configure, and maintain everything yourself.
              AKAI gives you the <strong className="text-white">finished team</strong>, tuned for your business, running from day one.
            </p>
          </div>
          <a
            href="/signup"
            className="flex-shrink-0 px-6 py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition whitespace-nowrap"
          >
            Meet your team →
          </a>
        </div>
      </div>
    </section>
  );
}
