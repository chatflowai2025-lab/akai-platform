'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import TrialBadge from '@/components/dashboard/TrialBadge';
import { useAuth } from '@/hooks/useAuth';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface Appointment {
  id: string;
  title?: string;
  startTime?: string;
  start?: string;
  summary?: string;
}

interface NeedsYouItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  count?: number;
}

const RAILWAY_API = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

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

// ── Weekly Score Ring ─────────────────────────────────────────────────────────
function WeeklyScoreRing({ score, loading }: { score: number; loading: boolean }) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-24 h-24 flex-shrink-0">
        {loading ? (
          <div className="w-24 h-24 rounded-full border-4 border-[#1f1f1f] animate-pulse" />
        ) : (
          <>
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={radius} stroke="#1f1f1f" strokeWidth="8" fill="none" />
              <circle
                cx="44"
                cy="44"
                r={radius}
                stroke="#D4AF37"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-[#D4AF37]">{score}</span>
              <span className="text-[10px] text-gray-500">/100</span>
            </div>
          </>
        )}
      </div>
      <div>
        <p className="text-white font-black text-sm">Weekly Score</p>
        <p className="text-gray-500 text-xs mt-0.5">AKAI pattern engine</p>
      </div>
    </div>
  );
}

// ── Left column — Today (activity feed) ──────────────────────────────────────
function TodayColumn({ items, loading, onRefresh }: { items: FeedItem[]; loading: boolean; onRefresh: () => void }) {
  const visible = items.slice(0, 12);

  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-white">📋 Today</h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-full">Live feed</span>
          <button
            onClick={onRefresh}
            className="text-[11px] text-gray-500 hover:text-white transition px-2 py-0.5 rounded border border-[#2a2a2a] hover:border-[#3a3a3a]"
          >
            ↻
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 bg-[#1a1a1a] rounded-xl animate-pulse" />
          ))}
          <p className="text-[10px] text-gray-700 text-center pt-1">Fetching activity…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center flex-1">
          <p className="text-2xl mb-2">🤫</p>
          <p className="text-gray-500 text-sm">All quiet — AKAI is watching for activity</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {visible.map(item => {
            const isWin = item.outcome === 'success';
            const isIssue = item.type === 'failure_recorded';
            const borderColor = isIssue ? 'border-l-red-500' : isWin ? 'border-l-[#D4AF37]' : 'border-l-[#2a2a2a]';
            const icon = isIssue ? '⚠️' : isWin ? '✅' : '📌';

            return (
              <div
                key={item.id}
                className={`flex items-start gap-2 p-3 bg-[#0d0d0d] border border-[#1a1a1a] border-l-2 ${borderColor} rounded-xl`}
              >
                <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-200 leading-snug">{item.insight}</p>
                  <p suppressHydrationWarning className="text-[10px] text-gray-600 mt-0.5">
                    {item.timestamp ? formatTime(item.timestamp) : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Centre column — Now (active/pending) ─────────────────────────────────────
interface NowColumnProps {
  pendingProposals: number;
  hotLeads: number;
  meetingCount: number;
  nextMeetingTime: string | null;
  followUpsDue: number;
  loading: boolean;
}

function NowColumn({ pendingProposals, hotLeads, meetingCount, nextMeetingTime, followUpsDue, loading }: NowColumnProps) {
  const router = useRouter();
  const allClear = !loading && pendingProposals === 0 && hotLeads === 0 && followUpsDue === 0;

  const items = [
    {
      icon: '📥',
      label: 'Inbox pending',
      count: pendingProposals,
      subLabel: pendingProposals === 1 ? 'proposal draft' : 'proposal drafts',
      href: '/email-guard',
      btnLabel: '→ Review proposals',
    },
    {
      icon: '📬',
      label: 'Follow-ups due',
      count: followUpsDue,
      subLabel: 'due today',
      href: '/email-guard',
      btnLabel: '→ Email Guard',
    },
    {
      icon: '📅',
      label: 'Meetings today',
      count: meetingCount,
      subLabel: nextMeetingTime ? `Next: ${nextMeetingTime}` : 'none scheduled',
      href: '/calendar',
      btnLabel: '→ Calendar',
    },
    {
      icon: '🔥',
      label: 'Hot lead alerts',
      count: hotLeads,
      subLabel: 'scored 8+ not actioned',
      href: '/email-guard',
      btnLabel: '→ View leads',
    },
  ];

  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black text-white">⚡ Now</h2>
        <span className="text-[11px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-full">Active</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-[#1a1a1a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : allClear ? (
        <div className="flex flex-col items-center justify-center py-10 text-center flex-1">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-gray-300 text-sm font-semibold">All clear</p>
          <p className="text-gray-600 text-xs mt-1">AKAI is on top of everything</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {items.map(item => (
            <div
              key={item.label}
              className={`p-3 rounded-xl border transition ${
                item.count > 0
                  ? 'bg-[#0d0d0d] border-[#2a2a2a]'
                  : 'bg-[#0a0a0a] border-[#1a1a1a] opacity-40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{item.label}</p>
                    <p className="text-[10px] text-gray-500">{item.subLabel}</p>
                  </div>
                </div>
                {item.count > 0 && (
                  <span className="text-lg font-black text-[#D4AF37]">{item.count}</span>
                )}
              </div>
              {item.count > 0 && (
                <button
                  onClick={() => router.push(item.href)}
                  className="mt-2 w-full text-[11px] font-semibold text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg py-1 hover:bg-[#D4AF37]/10 transition"
                >
                  {item.btnLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Right column — Needs You ──────────────────────────────────────────────────
function NeedsYouColumn({ items, loading }: { items: NeedsYouItem[]; loading: boolean }) {
  const router = useRouter();
  const hasUrgent = !loading && items.length > 0;

  return (
    <div className={`rounded-2xl p-5 flex flex-col h-full border transition-colors ${hasUrgent ? 'bg-[#140a0a] border-red-500/30' : 'bg-[#111] border-[#1f1f1f]'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black text-white">🙋 Needs you</h2>
          {hasUrgent && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
          )}
        </div>
        {hasUrgent && (
          <span className="text-[11px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
            {items.length} urgent
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-[#1a1a1a] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center flex-1">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-gray-300 text-sm font-semibold">Nothing needs you right now</p>
          <p className="text-gray-500 text-xs mt-1">AKAI is handling everything autonomously</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-xl hover:border-red-500/40 hover:bg-red-500/10 transition text-left group"
            >
              <span className="relative flex-shrink-0">
                <span className="text-base">{item.icon}</span>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">{item.label}</p>
                {item.count !== undefined && item.count > 0 && (
                  <p className="text-[10px] text-red-400/70">{item.count} action{item.count !== 1 ? 's' : ''} needed</p>
                )}
              </div>
              <span className="text-red-400/50 group-hover:text-red-400 transition text-sm flex-shrink-0">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { user, userProfile, loading, logout } = useAuth();

  const [stats, setStats] = useState<StatsSummary>({
    leads: 0,
    proposalsSent: 0,
    meetingsBooked: 0,
    revenuePipeline: '$0',
    loading: true,
    lastUpdated: null,
  });

  const [businessName, setBusinessName] = useState<string | null>(null);

  const [insightsData, setInsightsData] = useState<InsightsData>({
    insights: [],
    stats: {},
    period: '7d',
    loading: true,
  });

  const [feedData, setFeedData] = useState<FeedData>({
    items: [],
    generatedAt: '',
    loading: true,
  });

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

  // Command centre state
  const [pendingProposals, setPendingProposals] = useState(0);
  const [hotLeads, setHotLeads] = useState(0);
  const [meetingCount, setMeetingCount] = useState(0);
  const [nextMeetingTime, setNextMeetingTime] = useState<string | null>(null);
  const [followUpsDue, setFollowUpsDue] = useState(0);
  const [commandLoading, setCommandLoading] = useState(true);

  // ── Firestore profile / onboarding ───────────────────────────────────────
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
          !!data?.googleCalendarConnected ||
          !!data?.inboxConnection?.provider || // MS Outlook connected = onboarded
          !!data?.microsoftCalendarConnected;
        if (!onboardingComplete) {
          router.replace('/onboard');
        }
      } catch {
        // Non-fatal
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ── Welcome email — fires once per browser session, Firestore guards server-side ──
  useEffect(() => {
    if (!user) return;
    // Client-side session guard — never fires twice in the same tab session
    const sessionKey = `akai_welcome_sent_${user.uid}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    fetch('/api/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, email: user.email || '', name: user.displayName || '' }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ── Stats summary ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await user.getIdToken().catch(() => '');
        const headers: Record<string, string> = {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        };
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(`${RAILWAY_API}/api/stats/summary?userId=${user.uid}`, { headers, signal: ctrl.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Stats unavailable');
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
        if (!cancelled) setStats({ ...STAT_DEFAULTS, loading: false, lastUpdated: new Date() });
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // ── Intelligence insights ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await user.getIdToken().catch(() => '');
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(`${RAILWAY_API}/api/analytics/insights/${user.uid}`, {
          headers: { 'x-api-key': API_KEY, ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
          signal: ctrl.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Insights unavailable');
        const data = await res.json() as { insights: Insight[]; stats: Record<string, number>; period: string };
        if (!cancelled) setInsightsData({ ...data, loading: false });
      } catch {
        if (!cancelled) setInsightsData(prev => ({ ...prev, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // ── AKAI learnings / weekly score ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await user.getIdToken().catch(() => '');
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(`${RAILWAY_API}/api/analytics/learnings/${user.uid}`, {
          headers: { 'x-api-key': API_KEY, ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
          signal: ctrl.signal,
        });
        clearTimeout(timeoutId);
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
        if (!cancelled) setLearnings(prev => ({ ...prev, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // ── Activity feed (mount + every 60s) ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchFeed = async () => {
      try {
        const idToken = await user.getIdToken().catch(() => '');
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(`${RAILWAY_API}/api/analytics/feed/${user.uid}`, {
          headers: { 'x-api-key': API_KEY, ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
          signal: ctrl.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Feed unavailable');
        const data = await res.json() as { items: FeedItem[]; generatedAt: string };
        if (!cancelled) setFeedData({ items: data.items ?? [], generatedAt: data.generatedAt ?? '', loading: false });
      } catch {
        if (!cancelled) setFeedData(prev => ({ ...prev, loading: false }));
      }
    };
    fetchFeed();
    const intervalId = setInterval(fetchFeed, 60000);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [user]);

  // ── Command centre data (enquiries + appointments) ─────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // Safety timeout — if APIs hang >10s, stop loading spinner
    const timeout = setTimeout(() => {
      if (!cancelled) setCommandLoading(false);
    }, 10000);
    (async () => {
      setCommandLoading(true);
      try {
        const idToken = await user.getIdToken().catch(() => '');
        const headers: Record<string, string> = {
          'x-api-key': API_KEY,
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        };

        // Enquiries — proposals + hot leads + follow-ups
        const enquiriesCtrl = new AbortController();
        const enquiriesTimeout = setTimeout(() => enquiriesCtrl.abort(), 10000);
        const enquiriesRes = await fetch(`${RAILWAY_API}/api/email/enquiries/${user.uid}`, { headers, signal: enquiriesCtrl.signal });
        clearTimeout(enquiriesTimeout);
        if (enquiriesRes.ok) {
          const d = await enquiriesRes.json();
          if (!cancelled) {
            const enqs: Array<{ status?: string; leadScore?: number; events?: Array<{ type?: string; timestamp?: string }> }> = d.enquiries || [];
            const today = new Date().toDateString();
            const pending = enqs.filter(e => e.status === 'proposal_draft').length;
            const hot = enqs.filter(e => (e.leadScore || 0) >= 8).length;
            const followUps = enqs.filter(e =>
              (e.events || []).some(ev =>
                ev.type === 'followup_scheduled' &&
                ev.timestamp &&
                new Date(ev.timestamp).toDateString() === today
              )
            ).length;
            setPendingProposals(pending);
            setHotLeads(hot);
            setFollowUpsDue(followUps);
          }
        }

        // Calendar appointments
        const calCtrl = new AbortController();
        const calTimeout = setTimeout(() => calCtrl.abort(), 10000);
        const calRes = await fetch(`${RAILWAY_API}/api/calendar/appointments/${user.uid}`, { headers, signal: calCtrl.signal });
        clearTimeout(calTimeout);
        if (calRes.ok) {
          const d = await calRes.json();
          if (!cancelled) {
            const appts: Appointment[] = d.appointments || d.events || [];
            const today = new Date().toDateString();
            const todayAppts = appts.filter(a => {
              const t = a.startTime || a.start;
              return t && new Date(t).toDateString() === today;
            });
            setMeetingCount(todayAppts.length);
            if (todayAppts.length > 0) {
              const sorted = todayAppts.sort((a, b) => {
                const at = new Date(a.startTime || a.start || '').getTime();
                const bt = new Date(b.startTime || b.start || '').getTime();
                return at - bt;
              });
              const nextAppt = sorted[0];
              const t = nextAppt ? (nextAppt.startTime || nextAppt.start) : undefined;
              setNextMeetingTime(t ? formatTime(t) : null);
            }
          }
        }
      } catch {
        // Non-fatal — leave defaults
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setCommandLoading(false);
      }
    })();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [user]);

  const refreshFeed = () => {
    if (!user) return;
    setFeedData(prev => ({ ...prev, loading: true }));
    user.getIdToken().catch(() => '').then(idToken =>
      fetch(`${RAILWAY_API}/api/analytics/feed/${user.uid}`, {
        headers: { 'x-api-key': API_KEY, ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
      })
        .then(r => r.json())
        .then((data: { items: FeedItem[]; generatedAt: string }) => {
          setFeedData({ items: data.items ?? [], generatedAt: data.generatedAt ?? '', loading: false });
        })
        .catch(() => setFeedData(prev => ({ ...prev, loading: false })))
    );
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
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

  // "Needs You" checklist items
  const needsYouItems: NeedsYouItem[] = [];
  if (hotLeads > 0) {
    needsYouItems.push({ id: 'hot-leads', label: 'Unread hot leads (🔥 8+)', icon: '🔥', href: '/email-guard', count: hotLeads });
  }
  if (pendingProposals > 0) {
    needsYouItems.push({ id: 'proposals', label: 'Proposals awaiting approval', icon: '📄', href: '/email-guard', count: pendingProposals });
  }
  // Check account setup — use raw profile data via onboardingComplete proxy
  if (userProfile && !userProfile.onboardingComplete) {
    needsYouItems.push({ id: 'setup', label: 'Account setup incomplete', icon: '⚙️', href: '/settings' });
  }

  const proposalsThisWeek = insightsData.stats['proposal_sent'] || stats.proposalsSent;
  const meetingsThisWeek = insightsData.stats['meeting_booked'] || stats.meetingsBooked;
  const activeLeads = stats.leads;

  return (
    <DashboardLayout>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
        <div>
          <h1 className="text-xl font-black text-white">
            {resolvedBusinessName ? (
              <>Command Centre — <span className="text-[#D4AF37]">{resolvedBusinessName}</span> 🚀</>
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
            <span className="text-xs text-green-400 font-semibold">AKAI live</span>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Header row: score ring + micro-stats ──────────────────────── */}
          <section className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <WeeklyScoreRing score={learnings.weeklyScore} loading={learnings.loading} />
              <div className="flex-1 grid grid-cols-3 gap-4">
                {[
                  { label: 'Proposals this week', value: stats.loading ? '—' : String(proposalsThisWeek), icon: '📄' },
                  { label: 'Meetings this week', value: stats.loading ? '—' : String(meetingsThisWeek), icon: '📅' },
                  { label: 'Active leads', value: stats.loading ? '—' : String(activeLeads), icon: '🎯' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3 text-center">
                    <p className="text-lg">{icon}</p>
                    <p className="text-xl font-black text-white mt-1">{value}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Quick actions ────────────────────────────────────────────── */}
          <section>
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
                <span>Trigger Sophie</span>
              </button>
              <button
                onClick={() => router.push('/calendar')}
                className="flex flex-col items-center gap-2 p-4 bg-[#111] border border-[#2f2f2f] text-white rounded-2xl text-sm font-medium hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition"
              >
                <span className="text-2xl">📅</span>
                <span>Calendar</span>
              </button>
              <button
                onClick={() => router.push('/health')}
                className="flex flex-col items-center gap-2 p-4 bg-[#111] border border-[#2f2f2f] text-white rounded-2xl text-sm font-medium hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition"
              >
                <span className="text-2xl">🔍</span>
                <span>Web audit</span>
              </button>
            </div>
          </section>

          {/* ── 3-column command centre ──────────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left — Today */}
            <div className="lg:col-span-1">
              <TodayColumn
                items={feedData.items}
                loading={feedData.loading}
                onRefresh={refreshFeed}
              />
            </div>

            {/* Centre — Now */}
            <div className="lg:col-span-1">
              <NowColumn
                pendingProposals={pendingProposals}
                hotLeads={hotLeads}
                meetingCount={meetingCount}
                nextMeetingTime={nextMeetingTime}
                followUpsDue={followUpsDue}
                loading={commandLoading}
              />
            </div>

            {/* Right — Needs You */}
            <div className="lg:col-span-1">
              <NeedsYouColumn
                items={needsYouItems}
                loading={commandLoading}
              />
            </div>
          </section>

          {/* ── AKAI learned this week ───────────────────────────────────── */}
          {(insightsData.insights.length > 0 || !insightsData.loading) && (
            <section>
              <div className="bg-[#111] border border-[#1f1f1f] border-l-2 border-l-[#D4AF37]/60 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-black text-white">🧠 What AKAI learned this week</h2>
                  <span className="text-[11px] text-gray-600 bg-[#1a1a1a] px-2 py-0.5 rounded-full">Last 7 days</span>
                </div>
                {insightsData.loading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 bg-[#1f1f1f] rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-[#1f1f1f] rounded animate-pulse" />
                  </div>
                ) : insightsData.insights.length === 0 ? (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-gray-400 text-sm">No patterns yet — AKAI learns as you use it.</p>
                    <p className="text-gray-600 text-xs">Once you run campaigns and receive leads, AKAI will surface what&apos;s working.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {insightsData.insights.map((ins, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span>{({ conversion: '📄', calls: '📞', bookings: '📅', email: '✉️' } as Record<string, string>)[ins.type] || '•'}</span>
                        <span>{ins.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
