'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuth } from '@/hooks/useAuth';

// ── Types ─────────────────────────────────────────────────────────────────

interface Lead {
  id?: string;
  created_at?: string;
  status?: string;
  campaign_id?: string;
  call_made?: boolean;
  meeting_booked?: boolean;
}

interface SalesStats {
  totalLeadsThisMonth: number;
  activeCampaigns: number;
  callsMadeThisWeek: number;
  meetingsBooked: number;
}

// ── Stat Card ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  sublabel,
}: {
  label: string;
  value: number | string;
  icon: string;
  sublabel: string;
}) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col gap-2 hover:border-[#D4AF37]/20 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-xs text-gray-600">{sublabel}</p>
    </div>
  );
}

// ── Quick Action Card ─────────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  description,
  href,
}: {
  icon: string;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 hover:border-[#D4AF37]/30 hover:bg-[#141414] transition-colors group"
    >
      <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-[#D4AF37]/20 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <span className="text-gray-600 group-hover:text-[#D4AF37] transition-colors text-sm">↗</span>
    </a>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────

function ActivityFeed({ leads }: { leads: Lead[] }) {
  if (!leads || leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4 text-2xl">
          📭
        </div>
        <p className="text-white/60 font-semibold text-sm">No calls made yet.</p>
        <p className="text-gray-600 text-xs mt-2 max-w-[260px]">
          Launch your first campaign to start generating leads.
        </p>
        <a
          href="/onboard"
          className="mt-6 px-4 py-2 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-xl text-sm font-semibold hover:bg-[#D4AF37]/20 transition-colors"
        >
          Launch first campaign →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leads.slice(0, 10).map((lead, i) => (
        <div
          key={lead.id ?? i}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-sm flex-shrink-0">
            {lead.meeting_booked ? '📅' : lead.call_made ? '📞' : '🎯'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/70 truncate">
              {lead.meeting_booked
                ? 'Meeting booked'
                : lead.call_made
                ? 'Call completed'
                : 'New lead captured'}
            </p>
            {lead.created_at && (
              <p className="text-[11px] text-gray-600 mt-0.5">
                {new Date(lead.created_at).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                lead.status === 'qualified'
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : lead.status === 'contacted'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
              }`}
            >
              {lead.status ?? 'new'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function SalesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [stats, setStats] = useState<SalesStats>({
    totalLeadsThisMonth: 0,
    activeCampaigns: 0,
    callsMadeThisWeek: 0,
    meetingsBooked: 0,
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    async function fetchLeads() {
      try {
        const res = await fetch('https://api-server-production-2a27.up.railway.app/api/leads', {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_RAILWAY_API_KEY ?? '',
          },
          cache: 'no-store',
        });

        if (!res.ok) throw new Error('Non-OK response');

        const data = await res.json();
        const leadsArr: Lead[] = Array.isArray(data) ? data : data?.leads ?? [];
        setLeads(leadsArr);

        // Compute stats
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const thisMonth = leadsArr.filter(
          (l) => l.created_at && new Date(l.created_at) >= startOfMonth
        );
        const callsThisWeek = leadsArr.filter(
          (l) =>
            l.call_made &&
            l.created_at &&
            new Date(l.created_at) >= startOfWeek
        );
        const meetings = leadsArr.filter((l) => l.meeting_booked);

        // Active campaigns: distinct campaign_ids
        const campaignIds = new Set(
          leadsArr.map((l) => l.campaign_id).filter(Boolean)
        );

        setStats({
          totalLeadsThisMonth: thisMonth.length,
          activeCampaigns: campaignIds.size,
          callsMadeThisWeek: callsThisWeek.length,
          meetingsBooked: meetings.length,
        });
      } catch {
        // Gracefully show zeros on any error
        setStats({
          totalLeadsThisMonth: 0,
          activeCampaigns: 0,
          callsMadeThisWeek: 0,
          meetingsBooked: 0,
        });
        setLeads([]);
      } finally {
        setStatsLoading(false);
      }
    }

    fetchLeads();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📞</span>
              <h1 className="text-xl font-black text-white">Sales</h1>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">AI-powered outbound sales via Sophie AI</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-green-500/20 bg-green-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-semibold">Sophie AI live</span>
            </div>
            <a
              href="/onboard"
              className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity"
            >
              Configure Campaign →
            </a>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">

          {/* Live stats */}
          <section>
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
              Live stats
              {statsLoading && (
                <span className="ml-2 inline-block w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin align-middle" />
              )}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Leads this month"
                value={stats.totalLeadsThisMonth}
                icon="🎯"
                sublabel="from AI Clozr"
              />
              <StatCard
                label="Active campaigns"
                value={stats.activeCampaigns}
                icon="🚀"
                sublabel="running now"
              />
              <StatCard
                label="Calls this week"
                value={stats.callsMadeThisWeek}
                icon="📞"
                sublabel="by Sophie AI"
              />
              <StatCard
                label="Meetings booked"
                value={stats.meetingsBooked}
                icon="📅"
                sublabel="total pipeline"
              />
            </div>
          </section>

          {/* Quick actions */}
          <section>
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
              Quick actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <QuickAction
                icon="🚀"
                label="Launch Campaign"
                description="Start a new outbound sales campaign"
                href="/onboard"
              />
              <QuickAction
                icon="👥"
                label="View All Leads"
                description="See your full lead pipeline and status"
                href="/onboard"
              />
              <QuickAction
                icon="🤖"
                label="Configure Sophie AI"
                description="Tune your AI sales agent's voice & script"
                href="/onboard"
              />
            </div>
          </section>

          {/* Recent activity */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Recent activity
              </h2>
              {leads.length > 0 && (
                <a
                  href="/onboard"
                  className="text-xs text-[#D4AF37] hover:text-[#F59E0B] transition-colors"
                >
                  Configure →
                </a>
              )}
            </div>
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 min-h-[160px]">
              {statsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ActivityFeed leads={leads} />
              )}
            </div>
          </section>

          {/* CTA Banner */}
          <section>
            <div className="relative rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/5 to-transparent p-6 flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/[0.03] to-transparent pointer-events-none" />
              <div className="relative">
                <p className="font-black text-white text-lg">Ready to close more deals?</p>
                <p className="text-gray-500 text-sm mt-1">
                  Sophie AI is making calls 24/7. Manage your pipeline in the full portal.
                </p>
              </div>
              <a
                href="/onboard"
                className="relative flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity shadow-lg shadow-[#D4AF37]/20"
              >
                Manage Campaign →
              </a>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
