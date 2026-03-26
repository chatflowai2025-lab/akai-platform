'use client';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import ChatPanel from '@/components/dashboard/ChatPanel';
import { useAuth } from '@/hooks/useAuth';

const RAILWAY_API = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

interface SalesStats {
  leads: number;
  calls: number;
  meetings: number;
  loading: boolean;
}

// ── Quick stat card ──────────────────────────────────────────────────────────
function QuickStat({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: string;
  icon: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col gap-2 hover:border-[#D4AF37]/20 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      {loading ? (
        <div className="h-9 w-16 bg-[#1f1f1f] rounded-lg animate-pulse" />
      ) : (
        <p className="text-3xl font-black text-white">{value}</p>
      )}
      <p className="text-xs text-gray-600">all time</p>
    </div>
  );
}

// ── Module status pill ───────────────────────────────────────────────────────
function ModuleCard({
  icon,
  label,
  status,
  description,
  href,
}: {
  icon: string;
  label: string;
  status: 'live' | 'building' | 'planned';
  description: string;
  href?: string;
}) {
  const statusStyles = {
    live: 'bg-green-500/10 text-green-400 border-green-500/20',
    building: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    planned: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };
  const statusLabel = { live: 'Live', building: 'Beta', planned: 'Coming soon' };

  const inner = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusStyles[status]}`}
        >
          {statusLabel[status]}
        </span>
      </div>
      <div>
        <p className="font-bold text-white text-sm">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );

  const className = `bg-[#111] border rounded-2xl p-4 flex flex-col gap-3 transition-colors block ${
    status === 'live'
      ? 'border-[#D4AF37]/20 hover:border-[#D4AF37]/40 cursor-pointer'
      : 'border-[#1f1f1f] opacity-60'
  }`;

  if (href && status !== 'planned') {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return <div className={className}>{inner}</div>;
}

// ── Empty activity feed ──────────────────────────────────────────────────────
function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4 text-2xl">
        📭
      </div>
      <p className="text-white/60 font-semibold text-sm">No activity yet</p>
      <p className="text-gray-600 text-xs mt-1 max-w-[200px]">
        Once your Sales module is active, events will appear here.
      </p>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { user, userProfile, loading, logout } = useAuth();

  const [stats, setStats] = useState<SalesStats>({
    leads: 0,
    calls: 0,
    meetings: 0,
    loading: true,
  });

  // Fetch real sales stats from Railway API
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function fetchStats() {
      try {
        // Get Firebase ID token for authenticated requests
        const idToken = await user!.getIdToken();
        const authHeaders = {
          Authorization: `Bearer ${idToken}`,
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        };

        // Fetch leads and campaign status in parallel
        const [leadsRes, campaignRes] = await Promise.allSettled([
          fetch(`${RAILWAY_API}/api/leads`, { headers: authHeaders }),
          fetch(`${RAILWAY_API}/api/campaign/status`, { headers: authHeaders }),
        ]);

        let leadsCount = 0;
        let meetingsCount = 0;
        let callsCount = 0;

        // Parse leads
        if (leadsRes.status === 'fulfilled' && leadsRes.value.ok) {
          const leadsData = await leadsRes.value.json();
          const leads: Array<{ status?: string }> = leadsData.leads ?? [];
          leadsCount = leads.length;
          meetingsCount = leads.filter(
            (l) => l.status === 'booked'
          ).length;
        }

        // Parse campaign/call stats
        if (campaignRes.status === 'fulfilled' && campaignRes.value.ok) {
          const campData = await campaignRes.value.json();
          callsCount = campData.stats?.total ?? 0;
        }

        if (!cancelled) {
          setStats({
            leads: leadsCount,
            calls: callsCount,
            meetings: meetingsCount,
            loading: false,
          });
        }
      } catch {
        // Graceful fallback — show zeros, don't crash
        if (!cancelled) {
          setStats({ leads: 0, calls: 0, meetings: 0, loading: false });
        }
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userEmail = user.email ?? 'there';
  // Prefer businessName (set during onboarding) → displayName → email prefix
  const businessName = userProfile?.businessName || userProfile?.displayName || user.displayName;
  const displayName = businessName || userEmail.split('@')[0];

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
          <div>
            <h1 className="text-xl font-black text-white">
              {businessName ? (
                <>Welcome to AKAI, <span className="text-[#D4AF37]">{businessName}</span>! Your Sales module is ready. 🚀</>
              ) : (
                <>Welcome back, <span className="text-[#D4AF37]">{displayName}</span> 👋</>
              )}
            </h1>
            <p className="text-xs text-gray-600 mt-0.5">{userEmail}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-green-500/20 bg-green-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-semibold">Sales live</span>
            </div>
            <button
              onClick={logout}
              className="text-xs text-gray-600 hover:text-white transition px-3 py-1.5 rounded-lg border border-[#1f1f1f] hover:border-[#2f2f2f]"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Dashboard content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">

            {/* Quick stats */}
            <section>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
                Sales overview
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <QuickStat
                  label="Leads captured"
                  value={String(stats.leads)}
                  icon="🎯"
                  loading={stats.loading}
                />
                <QuickStat
                  label="Calls made"
                  value={String(stats.calls)}
                  icon="📞"
                  loading={stats.loading}
                />
                <QuickStat
                  label="Meetings booked"
                  value={String(stats.meetings)}
                  icon="📅"
                  loading={stats.loading}
                />
              </div>
            </section>

            {/* Sales Portal CTA */}
            <section>
              <div className="bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-white font-black text-lg">Sales Portal</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Manage leads, configure campaigns, and track your AI sales pipeline.
                  </p>
                </div>
                <a
                  href="/sales"
                  className="flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition whitespace-nowrap"
                >
                  Go to Sales →
                </a>
              </div>
            </section>

            {/* Quick actions */}
            <section>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
                Quick actions
              </h2>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/sales"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition"
                >
                  ⚙️ Configure Sales Module
                </a>
                <a
                  href="/sales"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#111] border border-[#2f2f2f] text-white rounded-xl text-sm font-medium hover:border-[#D4AF37]/30 transition"
                >
                  👥 View Leads
                </a>
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#111] border border-[#2f2f2f] text-white rounded-xl text-sm font-medium hover:border-[#D4AF37]/30 transition"
                >
                  ⚙️ Settings
                </a>
              </div>
            </section>

            {/* Active modules */}
            <section>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
                Modules
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ModuleCard
                  icon="📞"
                  label="Sales"
                  status="live"
                  description="AI-powered outbound sales calls & lead qualification"
                  href="/sales"
                />
                <ModuleCard
                  icon="🎯"
                  label="Recruit"
                  status="building"
                  description="AI candidate screening and pipeline management"
                  href="https://getakai.ai/recruit"
                />
                <ModuleCard
                  icon="🌐"
                  label="Web"
                  status="building"
                  description="Landing pages and web content generation"
                  href="https://getakai.ai/web"
                />
                <ModuleCard
                  icon="📣"
                  label="Ads"
                  status="planned"
                  description="Paid media strategy and creative generation"
                />
                <ModuleCard
                  icon="📱"
                  label="Social"
                  status="planned"
                  description="Social content calendar and auto-posting"
                />
              </div>
            </section>

            {/* Recent activity */}
            <section>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
                Recent activity
              </h2>
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl">
                <EmptyFeed />
              </div>
            </section>

          </div>

          {/* Chat panel */}
          <ChatPanel />
        </div>
      </main>
    </div>
  );
}
