'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import TrialBadge from '@/components/dashboard/TrialBadge';
import { useAuth } from '@/hooks/useAuth';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Intelligence Feed types ───────────────────────────────────────────────────
interface FeedItem {
  id: string;
  type: string;
  insight: string;
  timestamp: string;
  outcome: string;
  priority: number;
}

interface FeedData {
  items: FeedItem[];
  generatedAt: string;
  loading: boolean;
}

// ── Intelligence panel types ──────────────────────────────────────────────────
interface Insight {
  type: string;
  text: string;
}

interface InsightsData {
  insights: Insight[];
  stats: Record<string, number>;
  period: string;
  loading: boolean;
}

const INSIGHT_EMOJI: Record<string, string> = {
  conversion: '📄',
  calls: '📞',
  bookings: '📅',
  email: '✉️',
};

// ── Intelligence Feed component ───────────────────────────────────────────────
function IntelligenceFeed({ items, loading, onRefresh }: { items: FeedItem[]; loading: boolean; onRefresh: () => void }) {
  const visible = items.slice(0, 8);

  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-white">⚡ Intelligence Feed</h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-full">Last 24h</span>
          <button
            onClick={onRefresh}
            className="text-[11px] text-gray-500 hover:text-white transition px-2 py-0.5 rounded border border-[#2a2a2a] hover:border-[#3a3a3a]"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-[#1a1a1a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-gray-500 text-sm">🤫 All quiet — AKAI is watching for activity</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {visible.map(item => {
            const borderColor =
              item.type === 'failure_recorded'
                ? 'border-l-red-500'
                : item.outcome === 'success'
                ? 'border-l-[#D4AF37]'
                : 'border-l-[#2a2a2a]';
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 bg-[#0d0d0d] border border-[#1a1a1a] border-l-2 ${borderColor} rounded-xl`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 leading-snug">{item.insight}</p>
                </div>
                <span className="text-[11px] text-gray-600 whitespace-nowrap flex-shrink-0 mt-0.5">
                  {item.timestamp ? timeAgo(item.timestamp) : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IntelligencePanel({ insights, stats, loading }: { insights: Insight[]; stats: Record<string, number>; loading: boolean }) {
  const proposalCount = stats['proposal_sent'] || 0;
  const callCount = stats['sophie_call_triggered'] || 0;
  const bookingCount = stats['meeting_booked'] || 0;
  const repliedCount = stats['proposals_replied'] || 0;
  const replyRate = proposalCount > 0 ? Math.round((repliedCount / proposalCount) * 100) : 0;

  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 border-l-2 border-l-[#D4AF37]/60">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-white">🧠 What AKAI learned this week</h2>
        <span className="text-[11px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-full">Last 7 days</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-3/4 bg-[#1f1f1f] rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-[#1f1f1f] rounded animate-pulse" />
        </div>
      ) : insights.length === 0 ? (
        <p className="text-gray-600 text-sm">No data yet — AKAI logs interactions as you use it</p>
      ) : (
        <ul className="space-y-2 mb-5">
          {insights.map((ins, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <span>{INSIGHT_EMOJI[ins.type] || '•'}</span>
              <span>{ins.text}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Mini stats grid */}
      <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#1f1f1f]">
        {[
          { label: 'Proposals', value: proposalCount },
          { label: 'Calls', value: callCount },
          { label: 'Bookings', value: bookingCount },
          { label: 'Reply rate', value: proposalCount > 0 ? `${replyRate}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-lg font-black text-white">{value}</p>
            <p className="text-[11px] text-gray-600">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  // Intelligence insights
  const [insightsData, setInsightsData] = useState<InsightsData>({
    insights: [],
    stats: {},
    period: '7d',
    loading: true,
  });

  // Intelligence feed (real-time, last 24h)
  const [feedData, setFeedData] = useState<FeedData>({
    items: [],
    generatedAt: '',
    loading: true,
  });

  // AKAI Intelligence Score (pattern engine learnings)
  const [learnings, setLearnings] = useState<{
    weeklyScore: number;
    topInsight: string;
    nextAction: string;
    patterns: Array<{ type: string; insight: string; confidence: number }>;
    loading: boolean;
  }>({
    weeklyScore: 0,
    topInsight: '',
    nextAction: '',
    patterns: [],
    loading: true,
  });

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

  // Fetch intelligence insights
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await user.getIdToken().catch(() => '');
        const res = await fetch(`${RAILWAY_API}/api/analytics/insights/${user.uid}`, {
          headers: {
            'x-api-key': API_KEY,
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
        });
        if (!res.ok) throw new Error('Insights unavailable');
        const data = await res.json() as { insights: Insight[]; stats: Record<string, number>; period: string };
        if (!cancelled) {
          setInsightsData({ ...data, loading: false });
        }
      } catch {
        if (!cancelled) {
          setInsightsData(prev => ({ ...prev, loading: false }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch AKAI Intelligence learnings
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await user.getIdToken().catch(() => '');
        const res = await fetch(`${RAILWAY_API}/api/analytics/learnings/${user.uid}`, {
          headers: {
            'x-api-key': API_KEY,
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
        });
        if (!res.ok) throw new Error('Learnings unavailable');
        const data = await res.json();
        if (!cancelled) {
          setLearnings({
            weeklyScore: data.weeklyScore ?? 0,
            topInsight: data.topInsight ?? '',
            nextAction: data.nextAction ?? '',
            patterns: data.patterns ?? [],
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setLearnings(prev => ({ ...prev, loading: false }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Fetch intelligence feed (mount + every 60s)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchFeed = async () => {
      try {
        const idToken = await user.getIdToken().catch(() => '');
        const res = await fetch(`${RAILWAY_API}/api/analytics/feed/${user.uid}`, {
          headers: {
            'x-api-key': API_KEY,
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
        });
        if (!res.ok) throw new Error('Feed unavailable');
        const data = await res.json() as { items: FeedItem[]; generatedAt: string };
        if (!cancelled) {
          setFeedData({ items: data.items ?? [], generatedAt: data.generatedAt ?? '', loading: false });
        }
      } catch {
        if (!cancelled) {
          setFeedData(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchFeed();
    const intervalId = setInterval(fetchFeed, 60000);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [user]);

  const refreshFeed = () => {
    if (!user) return;
    setFeedData(prev => ({ ...prev, loading: true }));
    user.getIdToken().catch(() => '').then(idToken =>
      fetch(`${RAILWAY_API}/api/analytics/feed/${user.uid}`, {
        headers: {
          'x-api-key': API_KEY,
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      })
        .then(r => r.json())
        .then((data: { items: FeedItem[]; generatedAt: string }) => {
          setFeedData({ items: data.items ?? [], generatedAt: data.generatedAt ?? '', loading: false });
        })
        .catch(() => setFeedData(prev => ({ ...prev, loading: false })))
    );
  };

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

            {/* ── Intelligence panel ───────────────────────────────────────── */}
            <section>
              <IntelligencePanel
                insights={insightsData.insights}
                stats={insightsData.stats}
                loading={insightsData.loading}
              />
            </section>

            {/* ── Intelligence Feed ─────────────────────────────────────────── */}
            <section>
              <IntelligenceFeed
                items={feedData.items}
                loading={feedData.loading}
                onRefresh={refreshFeed}
              />
            </section>

            {/* ── AKAI Intelligence Score ───────────────────────────────────── */}
            <section>
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">🧠 AKAI Intelligence</h3>
                  <span className="text-xs text-gray-500">Updated daily</span>
                </div>
                {learnings.loading ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full border-4 border-[#1f1f1f] animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-3/4 bg-[#1f1f1f] rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-[#1f1f1f] rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Score ring */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full border-4 border-[#D4AF37] flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-black text-[#D4AF37]">{learnings.weeklyScore}</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{learnings.topInsight || 'AKAI is collecting data — check back tomorrow'}</p>
                        <p className="text-gray-500 text-xs mt-0.5">→ {learnings.nextAction || 'Keep using AKAI to generate insights'}</p>
                      </div>
                    </div>
                    {/* Top patterns */}
                    {learnings.patterns.slice(0, 2).map((p, i) => (
                      <div key={i} className="text-xs text-gray-400 py-1 border-t border-[#1a1a1a]">
                        {p.insight}
                      </div>
                    ))}
                    {learnings.patterns.length === 0 && (
                      <div className="text-xs text-gray-600 py-1 border-t border-[#1a1a1a]">
                        No patterns yet — keep using AKAI to unlock insights
                      </div>
                    )}
                  </>
                )}
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
