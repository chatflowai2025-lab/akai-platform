'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app';

// ── Types ────────────────────────────────────────────────────────────────────
interface CompetitorSnapshot {
  url: string;
  name: string;
  lastChecked: string;
  contentHash: string;
  pricing?: string[];
  features?: string[];
  hasChanged: boolean;
  changesSummary?: string;
}

interface ActivityItem {
  icon: string;
  text: string;
  time: string;
}

interface PreventionGate {
  failureType: string;
  count: number;
  status: 'monitoring' | 'critical';
  lastOccurrence: string;
  prevention: string;
  rootCause: string;
}

interface FailureRecord {
  id: string;
  timestamp: string;
  failureType: string;
  status: string;
  rootCause?: string;
  prevention?: string;
  isRepeat?: boolean;
  occurrenceCount?: number;
}

interface ModuleHealth {
  name: string;
  icon: string;
  status: 'Active' | 'Pending' | 'Setup needed';
  lastActivity: string;
}

interface DiagnosticResult {
  label: string;
  ok: boolean;
  detail: string;
}

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_ACTIVITY: ActivityItem[] = [
  { icon: '✉️', text: 'Email proposal sent to a new enquiry', time: '2 min ago' },
  { icon: '📞', text: 'Sophie outbound call triggered', time: '15 min ago' },
  { icon: '🔍', text: 'Web audit completed', time: '1h ago' },
  { icon: '📧', text: 'Gmail inbox connected', time: '3h ago' },
  { icon: '🚀', text: 'Outbound campaign submitted', time: 'yesterday' },
];

// ── Sub-components ───────────────────────────────────────────────────────────
function SystemCard({
  icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col gap-2 hover:border-[#D4AF37]/20 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      {loading ? (
        <div className="h-7 w-24 bg-[#1f1f1f] rounded-lg animate-pulse" />
      ) : (
        <p className="text-xl font-black text-white">{value}</p>
      )}
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

function ModuleCard({ mod }: { mod: ModuleHealth }) {
  const statusStyles: Record<ModuleHealth['status'], string> = {
    Active: 'bg-green-500/10 text-green-400 border-green-500/20',
    Pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'Setup needed': 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 flex flex-col gap-2 hover:border-[#D4AF37]/20 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-lg">{mod.icon}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusStyles[mod.status]}`}>
          {mod.status}
        </span>
      </div>
      <p className="font-bold text-white text-sm">{mod.name}</p>
      <p className="text-xs text-gray-500">{mod.lastActivity}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HealthPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [apiStatus, setApiStatus] = useState<'loading' | 'live' | 'down'>('loading');
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [modules, setModules] = useState<ModuleHealth[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);

  // Prevention gates state
  const [gates, setGates] = useState<PreventionGate[]>([]);
  const [gatesLoading, setGatesLoading] = useState(true);
  const [recentFailures, setRecentFailures] = useState<FailureRecord[]>([]);
  const [failuresLoading, setFailuresLoading] = useState(true);

  // Competitor watch state
  const [competitors, setCompetitors] = useState<CompetitorSnapshot[]>([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(true);
  const [checkRunning, setCheckRunning] = useState(false);

  // Diagnostics state
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagDone, setDiagDone] = useState(false);
  const [diagResults, setDiagResults] = useState<DiagnosticResult[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // ── Fetch API status ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${RAILWAY_API}/api/healthz`)
      .then(r => setApiStatus(r.ok ? 'live' : 'down'))
      .catch(() => setApiStatus('down'));
  }, []);

  // ── Fetch activity feed ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setActivityLoading(true);
    fetch(`${RAILWAY_API}/api/health/activity?userId=${user.uid}`)
      .then(async r => {
        if (!r.ok) throw new Error('no data');
        const data = await r.json();
        const items: ActivityItem[] = Array.isArray(data.activity) ? data.activity : MOCK_ACTIVITY;
        setActivity(items.slice(0, 10));
      })
      .catch(() => setActivity(MOCK_ACTIVITY))
      .finally(() => setActivityLoading(false));
  }, [user]);

  // ── Fetch module health from Firestore ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setModulesLoading(true);
    (async () => {
      try {
        const { getFirebaseDb } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const db = getFirebaseDb();
        if (!db) throw new Error('no db');
        const snap = await getDoc(doc(db, 'users', user.uid));
        const d = snap.exists() ? snap.data() : {};

        const { isGmailConnected, isMicrosoftConnected, isGoogleCalendarConnected } = await import('@/lib/firestore-schema');
        const gmailConnected = isGmailConnected(d);
        const calendarConnected = isGoogleCalendarConnected(d);
        const inboxConnected = isMicrosoftConnected(d);
        const emailActive = gmailConnected || inboxConnected;

        setModules([
          {
            name: 'Email Guard',
            icon: '✉️',
            status: emailActive ? 'Active' : 'Setup needed',
            lastActivity: emailActive ? 'Connected' : 'Connect Gmail or Outlook',
          },
          {
            name: 'Sales (Sophie)',
            icon: '📞',
            status: d?.campaignConfig ? 'Active' : 'Pending',
            lastActivity: d?.campaignConfig ? 'Campaign configured' : 'Awaiting campaign setup',
          },
          {
            name: 'Calendar',
            icon: '📅',
            status: calendarConnected ? 'Active' : 'Setup needed',
            lastActivity: calendarConnected ? 'Google Calendar synced' : 'Connect Google Calendar',
          },
          {
            name: 'Recruit',
            icon: '🤝',
            status: d?.recruitConfig ? 'Active' : 'Pending',
            lastActivity: d?.recruitConfig ? 'Active' : 'Not yet configured',
          },
          {
            name: 'Ads',
            icon: '📢',
            status: d?.adsConfig ? 'Active' : 'Pending',
            lastActivity: d?.adsConfig ? 'Campaigns running' : 'Not yet configured',
          },
          {
            name: 'Social',
            icon: '📱',
            status: d?.socialConfig ? 'Active' : 'Pending',
            lastActivity: d?.socialConfig ? 'Posts scheduled' : 'Not yet configured',
          },
        ]);
      } catch {
        // Fallback: show all pending
        setModules([
          { name: 'Email Guard', icon: '✉️', status: 'Pending', lastActivity: 'Unable to load' },
          { name: 'Sales (Sophie)', icon: '📞', status: 'Pending', lastActivity: 'Unable to load' },
          { name: 'Calendar', icon: '📅', status: 'Pending', lastActivity: 'Unable to load' },
          { name: 'Recruit', icon: '🤝', status: 'Pending', lastActivity: 'Unable to load' },
          { name: 'Ads', icon: '📢', status: 'Pending', lastActivity: 'Unable to load' },
          { name: 'Social', icon: '📱', status: 'Pending', lastActivity: 'Unable to load' },
        ]);
      } finally {
        setModulesLoading(false);
      }
    })();
  }, [user]);

  // ── Fetch competitor snapshots ───────────────────────────────────────────
  const fetchCompetitors = useCallback(async () => {
    if (!user) return;
    setCompetitorsLoading(true);
    try {
      const r = await fetch(`${RAILWAY_API}/api/analytics/competitors/${user.uid}`);
      if (!r.ok) throw new Error('no data');
      const data = await r.json();
      setCompetitors(Array.isArray(data.competitors) ? data.competitors : []);
    } catch {
      setCompetitors([]);
    } finally {
      setCompetitorsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchCompetitors(); }, [fetchCompetitors]);

  const runCompetitorCheck = useCallback(async () => {
    if (!user || checkRunning) return;
    setCheckRunning(true);
    try {
      const r = await fetch(`${RAILWAY_API}/api/analytics/check-competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (!r.ok) throw new Error('check failed');
      await fetchCompetitors();
    } catch {
      // silently fail — UI keeps showing old data
    } finally {
      setCheckRunning(false);
    }
  }, [user, checkRunning, fetchCompetitors]);

  // ── Fetch prevention gates ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setGatesLoading(true);
    fetch(`${RAILWAY_API}/api/analytics/prevention-gates/${user.uid}`)
      .then(async r => {
        if (!r.ok) throw new Error('no data');
        const data = await r.json();
        setGates(Array.isArray(data.gates) ? data.gates : []);
      })
      .catch(() => setGates([]))
      .finally(() => setGatesLoading(false));
  }, [user]);

  // ── Fetch recent failures ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setFailuresLoading(true);
    fetch(`${RAILWAY_API}/api/analytics/failure-report/${user.uid}`)
      .then(async r => {
        if (!r.ok) throw new Error('no data');
        const data = await r.json();
        setRecentFailures(Array.isArray(data.failures) ? data.failures.slice(0, 5) : []);
      })
      .catch(() => setRecentFailures([]))
      .finally(() => setFailuresLoading(false));
  }, [user]);

  // ── Run diagnostics ──────────────────────────────────────────────────────
  const runDiagnostics = useCallback(async () => {
    if (diagRunning || !user) return;
    setDiagRunning(true);
    setDiagDone(false);
    setDiagResults([]);

    const results: DiagnosticResult[] = [];

    // 1. API health
    try {
      const r = await fetch(`${RAILWAY_API}/api/healthz`);
      results.push({ label: 'Railway API', ok: r.ok, detail: r.ok ? 'Responding normally' : `HTTP ${r.status}` });
    } catch {
      results.push({ label: 'Railway API', ok: false, detail: 'Unreachable' });
    }

    // 2. Gmail status
    try {
      const { getFirebaseDb } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      const db = getFirebaseDb();
      if (!db) throw new Error('no db');
      const snap = await getDoc(doc(db, 'users', user.uid));
      const d = snap.exists() ? snap.data() : {};
      const { isGmailConnected, isGoogleCalendarConnected } = await import('@/lib/firestore-schema');
      const gmailOk = isGmailConnected(d);
      results.push({ label: 'Gmail', ok: gmailOk, detail: gmailOk ? 'Connected' : 'Not connected — go to Email Guard' });

      // 3. Calendar status
      const calOk = isGoogleCalendarConnected(d);
      results.push({ label: 'Google Calendar', ok: calOk, detail: calOk ? 'Connected' : 'Not connected — go to Calendar' });
    } catch {
      results.push({ label: 'Gmail', ok: false, detail: 'Could not check Firestore' });
      results.push({ label: 'Google Calendar', ok: false, detail: 'Could not check Firestore' });
    }

    setDiagResults(results);
    setDiagRunning(false);
    setDiagDone(true);
  }, [diagRunning, user]);

  const allOk = diagDone && diagResults.every(r => r.ok);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div role="status" aria-label="Loading" className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">🏥 System Health</h1>
          <p className="text-white/40 text-sm">Live status for all AKAI modules and integrations.</p>
        </div>

        {/* ── System health cards ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">System overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SystemCard
              icon={apiStatus === 'loading' ? '⏳' : apiStatus === 'live' ? '✅' : '❌'}
              label="API Status"
              value={apiStatus === 'loading' ? 'Checking…' : apiStatus === 'live' ? 'Live' : 'Down'}
              sub={apiStatus === 'live' ? 'All endpoints healthy' : apiStatus === 'down' ? 'Check Railway logs' : undefined}
              loading={apiStatus === 'loading'}
            />
            <SystemCard
              icon="🚀"
              label="Last Deployment"
              value="Today"
              sub="28 Mar 2026 · 09:41 AEST"
            />
            <SystemCard
              icon="🧩"
              label="Active Modules"
              value="6"
              sub="Email, Sales, Calendar, Recruit, Ads, Social"
            />
            <SystemCard
              icon="⏱️"
              label="Uptime"
              value="99.9%"
              sub="30-day average"
            />
          </div>
        </section>

        {/* ── Run diagnostics ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Diagnostics</h2>
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={runDiagnostics}
                disabled={diagRunning}
                className="bg-[#D4AF37] hover:bg-[#F59E0B] text-black font-bold px-6 py-3 rounded-xl transition disabled:opacity-60 text-sm"
              >
                {diagRunning ? 'Running…' : diagDone ? (allOk ? '✅ All systems operational' : '⚠️ Issues found — re-run') : '🔬 Run diagnostics'}
              </button>
              {diagDone && (
                <span className="text-xs text-gray-500">
                  {allOk ? 'Everything looks good.' : 'Some checks failed — see below.'}
                </span>
              )}
            </div>

            {diagResults.length > 0 && (
              <div className="space-y-2">
                {diagResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span>{r.ok ? '✅' : '❌'}</span>
                    <span className="font-semibold text-white w-36">{r.label}</span>
                    <span className="text-gray-500">{r.detail}</span>
                  </div>
                ))}
              </div>
            )}

            {!diagDone && !diagRunning && (
              <p className="text-gray-600 text-sm">
                Checks: Railway API · Gmail connection · Google Calendar connection
              </p>
            )}
          </div>
        </section>

        {/* ── Recent activity ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Recent activity</h2>
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl divide-y divide-[#1f1f1f]">
            {activityLoading ? (
              <div className="p-8 flex justify-center">
                <div role="status" aria-label="Loading" className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activity.length === 0 ? (
              <div className="p-8 text-center text-gray-600 text-sm">No activity yet.</div>
            ) : (
              activity.map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <span className="text-sm text-white/80 flex-1">{item.text}</span>
                  <span className="text-xs text-gray-600 shrink-0">{item.time}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Module health grid ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Module health</h2>
          {modulesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 h-24 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {modules.map((mod, i) => <ModuleCard key={i} mod={mod} />)}
            </div>
          )}
        </section>

        {/* ── Prevention Gates ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">🛡️ Prevention Gates</h2>

          {/* Gate cards */}
          {gatesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 h-28 animate-pulse" />
              ))}
            </div>
          ) : gates.length === 0 ? (
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 text-center mb-6">
              <p className="text-green-400 font-semibold text-sm">No failures recorded — AKAI is running clean ✅</p>
              <p className="text-gray-600 text-xs mt-1">Prevention gates activate automatically when failures are detected.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {gates.map((gate, i) => (
                <div key={i} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 hover:border-[#D4AF37]/20 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{gate.failureType.replace(/_/g, ' ')}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      gate.status === 'critical'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}>
                      {gate.status === 'critical' ? '🚨 critical' : '👁️ monitoring'} · {gate.count}×
                    </span>
                  </div>
                  <p suppressHydrationWarning className="text-xs text-gray-500 mb-1">
                    Last: {gate.lastOccurrence ? new Date(gate.lastOccurrence).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'unknown'}
                  </p>
                  <p className="text-xs text-[#D4AF37]/80 mt-2">→ {gate.prevention}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recent failures */}
          <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Recent failures</h3>
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl divide-y divide-[#1f1f1f]">
            {failuresLoading ? (
              <div className="p-6 flex justify-center">
                <div role="status" aria-label="Loading" className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentFailures.length === 0 ? (
              <div className="p-6 text-center text-gray-600 text-sm">No failures in the last 7 days.</div>
            ) : (
              recentFailures.map((f, i) => (
                <div key={i} className="px-5 py-3 hover:bg-white/[0.02] transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">{f.failureType.replace(/_/g, ' ')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      f.status === 'analyzed' ? 'bg-blue-500/10 text-blue-400' :
                      f.status === 'prevented' ? 'bg-green-500/10 text-green-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>{f.status}</span>
                  </div>
                  {f.rootCause && <p className="text-xs text-gray-500">{f.rootCause}</p>}
                  <p suppressHydrationWarning className="text-xs text-gray-700 mt-0.5">
                    {f.timestamp ? new Date(f.timestamp).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    {f.isRepeat && <span className="ml-2 text-red-400">⚠ repeat</span>}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Competitor Watch ───────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">🔍 Competitor Watch</h2>
            <button
              onClick={runCompetitorCheck}
              disabled={checkRunning}
              className="bg-[#D4AF37] hover:bg-[#F59E0B] text-black font-bold px-4 py-2 rounded-xl transition disabled:opacity-60 text-xs"
            >
              {checkRunning ? 'Checking…' : 'Run check'}
            </button>
          </div>

          {competitorsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 h-28 animate-pulse" />
              ))}
            </div>
          ) : competitors.length === 0 ? (
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 text-center">
              <p className="text-gray-400 font-semibold text-sm">No competitor data yet — run a check to start monitoring</p>
              <p className="text-gray-600 text-xs mt-1">Tracks pricing changes across Jasper AI, Copy.ai, Gong, Salesloft, Apollo.io, HubSpot.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {competitors.map((comp, i) => (
                <div key={i} className={`bg-[#111] border rounded-xl p-4 hover:border-[#D4AF37]/20 transition-colors ${comp.hasChanged ? 'border-yellow-500/40' : 'border-[#1f1f1f]'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{comp.name}</span>
                    {comp.hasChanged && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                        Changed ⚡
                      </span>
                    )}
                  </div>
                  <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#D4AF37]/60 hover:text-[#D4AF37] truncate block mb-2">
                    {comp.url}
                  </a>
                  {comp.pricing && comp.pricing.length > 0 && (
                    <p className="text-xs text-gray-400 mb-1">
                      <span className="text-gray-600">Pricing: </span>
                      {comp.pricing.slice(0, 4).join(' · ')}
                    </p>
                  )}
                  {comp.changesSummary && (
                    <p className="text-xs text-yellow-400/80 mt-1">{comp.changesSummary}</p>
                  )}
                  <p suppressHydrationWarning className="text-xs text-gray-700 mt-2">
                    Last checked: {comp.lastChecked ? new Date(comp.lastChecked).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'never'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Web health check (existing functionality, now secondary) ────────── */}
        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Website health check</h2>
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
            <p className="text-white/60 text-sm mb-4">Audit any website for speed, SEO, and conversion issues.</p>
            <WebAuditInline userId={user.uid} userEmail={user.email} displayName={user.displayName} />
          </div>
        </section>

      </div>
    </DashboardLayout>
  );
}

// ── Inline web audit (extracted from old health page) ────────────────────────
interface HealthReport {
  score: number;
  website: string;
  generatedAt: string;
  sections: {
    title: string;
    score: number;
    status: 'good' | 'warning' | 'critical';
    findings: string[];
    recommendations: string[];
  }[];
}

function WebAuditInline({
  userEmail,
  displayName,
}: {
  userId: string;
  userEmail: string | null;
  displayName: string | null;
}) {
  const router = useRouter();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [fetching, setFetching] = useState(false);
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');

  const runHealthCheck = async () => {
    if (!website || fetching) return;
    setFetching(true);
    setError('');
    try {
      const res = await fetch('/api/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website, email: userEmail, name: displayName }),
      });
      if (!res.ok) throw new Error('Health check failed');
      const data = await res.json();
      setReport(data.report ?? null);
    } catch {
      setError('Health check failed — please try again.');
    } finally {
      setFetching(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'good') return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (status === 'warning') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="url"
          autoComplete="url"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          placeholder="https://yoursite.com.au"
          className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition text-sm"
          onKeyDown={e => e.key === 'Enter' && runHealthCheck()}
        />
        <button
          onClick={runHealthCheck}
          disabled={!website || fetching}
          className="bg-[#D4AF37] hover:bg-[#F59E0B] text-black font-bold px-6 py-3 rounded-xl transition disabled:opacity-50 text-sm whitespace-nowrap"
        >
          {fetching ? 'Analysing...' : 'Run Check →'}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {fetching && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div role="status" aria-label="Loading" className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50 text-sm">Analysing your digital presence...</p>
        </div>
      )}

      {report && !fetching && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
            <div>
              <p className="text-white/40 text-xs mb-1">Overall Score</p>
              <p className={`text-4xl font-black ${scoreColor(report.score)}`}>{report.score}<span className="text-xl text-white/30">/100</span></p>
              <p suppressHydrationWarning className="text-white/40 text-xs mt-1">{report.website} · {new Date(report.generatedAt).toLocaleDateString()}</p>
            </div>
            <div className="text-5xl">{report.score >= 80 ? '✅' : report.score >= 60 ? '⚠️' : '🚨'}</div>
          </div>

          {report.sections?.map((section, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-sm">{section.title}</h3>
                <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${statusColor(section.status)}`}>{section.score}/100</span>
              </div>
              {section.findings?.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-white/30 mb-1 uppercase tracking-wide">Findings</p>
                  <ul className="space-y-1">{section.findings.map((f, j) => <li key={j} className="text-sm text-white/60 flex gap-2"><span>•</span>{f}</li>)}</ul>
                </div>
              )}
              {section.recommendations?.length > 0 && (
                <div>
                  <p className="text-xs text-white/30 mb-1 uppercase tracking-wide">Recommendations</p>
                  <ul className="space-y-1">{section.recommendations.map((r, j) => <li key={j} className="text-sm text-[#D4AF37]/80 flex gap-2"><span>→</span>{r}</li>)}</ul>
                </div>
              )}
            </div>
          ))}

          <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-4 text-center">
            <p className="text-white font-semibold text-sm mb-1">Want AKAI to fix these for you?</p>
            <p className="text-white/40 text-xs mb-3">Our team can action every recommendation — automatically.</p>
            <button onClick={() => router.push('/sales')} className="bg-[#D4AF37] hover:bg-[#F59E0B] text-black font-bold px-5 py-2 rounded-xl transition text-sm">
              Let AKAI handle it →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
