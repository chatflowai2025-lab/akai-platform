'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import ChatPanel from '@/components/dashboard/ChatPanel';
import { useAuth } from '@/hooks/useAuth';

// ── Quick stat card ──────────────────────────────────────────────────────────
function QuickStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col gap-2 hover:border-[#D4AF37]/20 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-xs text-gray-600">this week</p>
    </div>
  );
}

// ── Module status pill ───────────────────────────────────────────────────────
function ModuleCard({
  icon,
  label,
  status,
  description,
}: {
  icon: string;
  label: string;
  status: 'live' | 'building' | 'planned';
  description: string;
}) {
  const statusStyles = {
    live: 'bg-green-500/10 text-green-400 border-green-500/20',
    building: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    planned: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };
  const statusLabel = { live: 'Live', building: 'Beta', planned: 'Coming soon' };

  return (
    <div
      className={`bg-[#111] border rounded-2xl p-4 flex flex-col gap-3 transition-colors ${
        status === 'live'
          ? 'border-[#D4AF37]/20 hover:border-[#D4AF37]/40'
          : 'border-[#1f1f1f] opacity-60'
      }`}
    >
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
  const { user, loading, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<string>('overview');

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
  const displayName = userEmail.split('@')[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
          <div>
            <h1 className="text-xl font-black text-white">
              Welcome back,{' '}
              <span className="text-[#D4AF37]">{displayName}</span> 👋
            </h1>
            <p className="text-xs text-gray-600 mt-0.5">{userEmail}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-500">Sales module live</span>
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
                This week
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <QuickStat label="Leads captured" value="0" icon="🎯" />
                <QuickStat label="Calls made" value="0" icon="📞" />
                <QuickStat label="Meetings booked" value="0" icon="📅" />
              </div>
            </section>

            {/* Quick actions */}
            <section>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
                Quick actions
              </h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveModule('sales')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition"
                >
                  ⚙️ Configure Sales Module
                </button>
                <button
                  onClick={() => setActiveModule('sales')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#111] border border-[#2f2f2f] text-white rounded-xl text-sm font-medium hover:border-[#D4AF37]/30 transition"
                >
                  👥 View Leads
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#111] border border-[#2f2f2f] text-white rounded-xl text-sm font-medium hover:border-[#D4AF37]/30 transition"
                >
                  ⚙️ Settings
                </button>
              </div>
            </section>

            {/* Active modules */}
            <section>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
                Modules
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <ModuleCard
                  icon="📞"
                  label="Sales"
                  status="live"
                  description="AI-powered outbound sales calls & lead qualification"
                />
                <ModuleCard
                  icon="🎯"
                  label="Recruit"
                  status="building"
                  description="AI candidate screening and pipeline management"
                />
                <ModuleCard
                  icon="🌐"
                  label="Web"
                  status="building"
                  description="Landing pages and web content generation"
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
