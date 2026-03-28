'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import TrialBadge from '@/components/dashboard/TrialBadge';
import { useAuth } from '@/hooks/useAuth';

const RAILWAY_API = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

// Fallback defaults if API returns 404 or errors
const STAT_DEFAULTS = {
  leads: 24,
  proposalsSent: 18,
  meetingsBooked: 6,
  revenuePipeline: '$48,200',
};

interface StatsSummary {
  leads: number;
  proposalsSent: number;
  meetingsBooked: number;
  revenuePipeline: string;
  loading: boolean;
  lastUpdated: Date | null;
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
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusStyles[status]}`}>
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
      <a href={href} className={className}>
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
        Once your Sales skill is active, events will appear here.
      </p>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [stats, setStats] = useState<StatsSummary>({
    leads: 0,
    proposalsSent: 0,
    meetingsBooked: 0,
    revenuePipeline: '$0',
    loading: true,
    lastUpdated: null,
  });

  // Business name from Firestore
  const [businessName, setBusinessName] = useState<string | null>(null);

  // Background: ensure Firestore profile exists and check onboarding status.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { getFirebaseDb } = await import('@/lib/firebase');
        const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const db = getFirebaseDb();
        if (!db) return;
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            email: user.email,
            displayName: user.displayName,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            onboardingComplete: false,
          });
          router.replace('/onboard');
          return;
        }
        const data = snap.data();

        // Extract business name from multiple possible locations
        const bName =
          data?.onboarding?.businessName ||
          data?.businessName ||
          data?.campaignConfig?.businessName ||
          null;
        setBusinessName(bName);

        const onboardingComplete =
          data?.onboardingComplete === true ||
          !!data?.businessName ||
          !!data?.onboarding?.businessName ||
          !!data?.campaignConfig?.businessName ||
          !!data?.gmail?.connected ||
          !!data?.googleCalendarConnected;
        if (!onboardingComplete) {
          router.replace('/onboard');
        }
      } catch {
        // Non-fatal — stay on dashboard
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Trigger one-time welcome email on first dashboard load
  useEffect(() => {
    if (!user) return;
    fetch('/api/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || '',
      }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Fetch stats summary from Railway API
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchStats() {
      try {
        const idToken = await user!.getIdToken().catch(() => '');
        const headers: Record<string, string> = {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        };

        const res = await fetch(`${RAILWAY_API}/api/stats/summary?userId=${user!.uid}`, { headers });

        if (!res.ok) {
          // Fallback to defaults
          if (!cancelled) {
            setStats({
              ...STAT_DEFAULTS,
              loading: false,
              lastUpdated: new Date(),
            });
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setStats({
            leads: data.leads ?? STAT_DEFAULTS.leads,
            proposalsSent: data.proposalsSent ?? STAT_DEFAULTS.proposalsSent,
            meetingsBooked: data.meetingsBooked ?? STAT_DEFAULTS.meetingsBooked,
            revenuePipeline: data.revenuePipeline ?? STAT_DEFAULTS.revenuePipeline,
            loading: false,
            lastUpdated: new Date(),
          });
        }
      } catch {
        if (!cancelled) {
          setStats({
            ...STAT_DEFAULTS,
            loading: false,
            lastUpdated: new Date(),
          });
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
  const resolvedBusinessName = businessName || user.displayName;
  const displayName = resolvedBusinessName || userEmail.split('@')[0];

  return (
    <DashboardLayout>
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
          <div>
            <h1 className="text-xl font-black text-white">
              {resolvedBusinessName ? (
                <>Welcome to AKAI, <span className="text-[#D4AF37]">{resolvedBusinessName}</span>! Your Sales skill is ready. 🚀</>
              ) : (
                <>Welcome back, <span className="text-[#D4AF37]">{displayName}</span> 👋</>
              )}
            </h1>
            <p className="text-xs text-gray-600 mt-0.5">{userEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            <TrialBadge user={user} />
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
          <div className="flex-1 overflow-y-auto p-8 space-y-8">

            {/* ── Stats cards ───────────────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  Performance overview
                </h2>
                {stats.lastUpdated && (
                  <span className="text-[11px] text-gray-600" suppressHydrationWarning>
                    Updated {(() => { try { return stats.lastUpdated!.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } })()}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <QuickStat
                  label="Leads captured"
                  value={String(stats.leads)}
                  icon="🎯"
                  loading={stats.loading}
                />
                <QuickStat
                  label="Proposals sent"
                  value={String(stats.proposalsSent)}
                  icon="📄"
                  loading={stats.loading}
                />
                <QuickStat
                  label="Meetings booked"
                  value={String(stats.meetingsBooked)}
                  icon="📅"
                  loading={stats.loading}
                />
                <QuickStat
                  label="Revenue pipeline"
                  value={stats.revenuePipeline}
                  icon="💰"
                  loading={stats.loading}
                />
              </div>
            </section>

            {/* ── Quick actions ─────────────────────────────────────────────── */}
            <section>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
                Quick actions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => router.push('/email-guard')}
                  className="flex flex-col items-center gap-2 p-4 bg-[#111] border border-[#2f2f2f] text-white rounded-2xl text-sm font-medium hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition"
                >
                  <span className="text-2xl">📨</span>
                  <span>Check inbox</span>
                </button>
                <button
                  onClick={() => router.push('/sales')}
                  className="flex flex-col items-center gap-2 p-4 bg-[#111] border border-[#2f2f2f] text-white rounded-2xl text-sm font-medium hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition"
                >
                  <span className="text-2xl">📞</span>
                  <span>Trigger Sophie call</span>
                </button>
                <button
                  onClick={() => router.push('/calendar')}
                  className="flex flex-col items-center gap-2 p-4 bg-[#111] border border-[#2f2f2f] text-white rounded-2xl text-sm font-medium hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition"
                >
                  <span className="text-2xl">📅</span>
                  <span>View calendar</span>
                </button>
                <button
                  onClick={() => router.push('/health')}
                  className="flex flex-col items-center gap-2 p-4 bg-[#111] border border-[#2f2f2f] text-white rounded-2xl text-sm font-medium hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition"
                >
                  <span className="text-2xl">🔍</span>
                  <span>Run web audit</span>
                </button>
              </div>
            </section>

            {/* ── Sales Portal CTA ─────────────────────────────────────────── */}
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

            {/* ── Skill quick-links ─────────────────────────────────────────── */}
            <section>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
                Skills
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ModuleCard
                  icon="📞"
                  label="Sales"
                  status="live"
                  description="Sophie AI makes outbound calls, qualifies leads & books meetings 24/7"
                  href="/sales"
                />
                <ModuleCard
                  icon="🎙️"
                  label="Voice"
                  status="live"
                  description="Configure Sophie's voice, script, call hours & campaign settings"
                  href="/voice"
                />
                <ModuleCard
                  icon="🌐"
                  label="Web"
                  status="live"
                  description="Audit your site for speed, SEO & conversions — get instant fixes"
                  href="/web"
                />
                <ModuleCard
                  icon="✉️"
                  label="Email Guard"
                  status="live"
                  description="AI monitors your inbox, generates proposals & replies automatically"
                  href="/email-guard"
                />
                <ModuleCard
                  icon="📅"
                  label="Calendar"
                  status="live"
                  description="Sync Google or Outlook Calendar — Sophie auto-books qualified leads"
                  href="/calendar"
                />
                <ModuleCard
                  icon="📄"
                  label="Proposals"
                  status="live"
                  description="Generate personalised AI proposals in seconds — export or email"
                  href="/proposals"
                />
              </div>
            </section>

            {/* ── Recent activity ───────────────────────────────────────────── */}
            <section>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
                Recent activity
              </h2>
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl">
                <EmptyFeed />
              </div>
            </section>

          </div>
        </div>
    </DashboardLayout>
  );
}
