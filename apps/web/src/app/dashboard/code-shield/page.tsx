'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';

// ── Types ─────────────────────────────────────────────────────────────────────

type GateStatus = 'pass' | 'fail' | 'pending' | 'running';

interface GateResult {
  id: string;
  label: string;
  icon: string;
  status: GateStatus;
  detail?: string;
  durationMs?: number;
}

interface RunResult {
  runId: string;
  startedAt: string;
  completedAt: string | null;
  overallStatus: 'pass' | 'fail' | 'running';
  gates: GateResult[];
}

const GATE_DEFINITIONS: Pick<GateResult, 'id' | 'label' | 'icon'>[] = [
  { id: 'type-check',       label: 'TypeScript type-check',   icon: '🔷' },
  { id: 'lint',             label: 'ESLint',                   icon: '🔍' },
  { id: 'schema-drift',     label: 'Schema drift',             icon: '🗄️' },
  { id: 'cve-audit',        label: 'CVE audit',                icon: '🔐' },
  { id: 'hardcoded-url',    label: 'Hardcoded URL scan',       icon: '🔗' },
  { id: 'build-warnings',   label: 'Build warnings',           icon: '🏗️' },
];

function statusColor(status: GateStatus) {
  switch (status) {
    case 'pass':    return 'text-green-400';
    case 'fail':    return 'text-red-400';
    case 'running': return 'text-[#D4AF37] animate-pulse';
    default:        return 'text-gray-500';
  }
}

function statusBadge(status: GateStatus) {
  switch (status) {
    case 'pass':    return 'bg-green-500/10 border-green-500/20 text-green-400';
    case 'fail':    return 'bg-red-500/10 border-red-500/20 text-red-400';
    case 'running': return 'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37]';
    default:        return 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-500';
  }
}

function statusIcon(status: GateStatus) {
  switch (status) {
    case 'pass':    return '✅';
    case 'fail':    return '❌';
    case 'running': return '⏳';
    default:        return '⬜';
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-AU', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── Gate Card ─────────────────────────────────────────────────────────────────

function GateCard({ gate }: { gate: GateResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`bg-[#0d0d0d] border rounded-xl overflow-hidden transition-all ${
        gate.status === 'fail'
          ? 'border-red-500/30'
          : gate.status === 'pass'
          ? 'border-green-500/20'
          : 'border-[#1f1f1f]'
      }`}
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[#141414] transition"
        onClick={() => gate.detail && setExpanded(e => !e)}
      >
        {/* Gate icon */}
        <span className="text-xl flex-shrink-0">{gate.icon}</span>

        {/* Label + detail preview */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{gate.label}</p>
          {gate.detail && !expanded && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{gate.detail}</p>
          )}
        </div>

        {/* Duration */}
        {gate.durationMs !== undefined && gate.status !== 'running' && gate.status !== 'pending' && (
          <span className="text-xs text-gray-600 flex-shrink-0">{formatDuration(gate.durationMs)}</span>
        )}

        {/* Status badge */}
        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-semibold ${statusBadge(gate.status)}`}>
          {statusIcon(gate.status)} {gate.status === 'running' ? 'Running…' : gate.status === 'pending' ? 'Pending' : gate.status === 'pass' ? 'Pass' : 'Fail'}
        </span>

        {/* Expand toggle */}
        {gate.detail && (
          <span className={`text-gray-600 text-xs transition flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && gate.detail && (
        <div className="border-t border-[#1f1f1f] bg-[#080808] p-4">
          <pre className={`text-xs leading-relaxed whitespace-pre-wrap font-mono ${statusColor(gate.status)}`}>
            {gate.detail}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── History item ──────────────────────────────────────────────────────────────

function HistoryItem({ run, isCurrent }: { run: RunResult; isCurrent: boolean }) {
  const passCount = run.gates.filter(g => g.status === 'pass').length;
  const failCount = run.gates.filter(g => g.status === 'fail').length;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] last:border-0 ${isCurrent ? 'bg-[#0d0d0d]' : ''}`}>
      <span className="text-base flex-shrink-0">{run.overallStatus === 'pass' ? '✅' : run.overallStatus === 'running' ? '⏳' : '❌'}</span>
      <div className="flex-1 min-w-0">
        <p suppressHydrationWarning className="text-xs text-white font-medium">{formatDate(run.startedAt)}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{passCount} pass · {failCount} fail</p>
      </div>
      {isCurrent && (
        <span className="text-[11px] bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-2 py-0.5 rounded-full font-semibold">Latest</span>
      )}
    </div>
  );
}

// ── Bug Reports ───────────────────────────────────────────────────────────────

interface BugReport {
  id: string;
  error: string;
  route: string;
  userId?: string | null;
  timestamp?: { toDate?: () => Date } | null;
  clientTimestamp?: string | null;
  status: 'open' | 'fixed';
  priority: number;
  suggestion: string;
  description?: string | null;
}

function priorityColor(priority: number): string {
  if (priority >= 8) return 'text-red-400';
  if (priority >= 6) return 'text-orange-400';
  if (priority >= 4) return 'text-yellow-400';
  return 'text-green-400';
}

function priorityBadge(priority: number): string {
  if (priority >= 8) return 'bg-red-500/10 border-red-500/20 text-red-400';
  if (priority >= 6) return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
  if (priority >= 4) return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
  return 'bg-green-500/10 border-green-500/20 text-green-400';
}

function BugReportCard({ bug, onMarkFixed }: { bug: BugReport; onMarkFixed: (id: string) => void }) {
  const [marking, setMarking] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleMarkFixed = async () => {
    setMarking(true);
    try {
      const db = getFirebaseDb();
      if (db) {
        await updateDoc(doc(db, 'bugReports', bug.id), { status: 'fixed' });
      }
      onMarkFixed(bug.id);
    } catch (err) {
      console.error('Failed to mark bug fixed:', err);
    } finally {
      setMarking(false);
    }
  };

  const timestamp = bug.timestamp?.toDate?.() ?? (bug.clientTimestamp ? new Date(bug.clientTimestamp) : null);

  return (
    <div className={`bg-[#0d0d0d] border rounded-xl overflow-hidden ${bug.status === 'fixed' ? 'border-green-500/20 opacity-70' : 'border-[#1f1f1f]'}`}>
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-[#141414] transition"
        onClick={() => setExpanded(e => !e)}
      >
        <span className={`text-xl font-black flex-shrink-0 mt-0.5 ${priorityColor(bug.priority)}`}>
          P{bug.priority}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <code className="text-xs bg-[#1a1a1a] px-2 py-0.5 rounded text-gray-300">{bug.route}</code>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${priorityBadge(bug.priority)}`}>
              Priority {bug.priority}/10
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${bug.status === 'fixed' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-500'}`}>
              {bug.status === 'fixed' ? '✅ Fixed' : '🔴 Open'}
            </span>
          </div>
          <p className="text-sm text-white truncate">{bug.error}</p>
          {timestamp && (
            <p suppressHydrationWarning className="text-[11px] text-gray-600 mt-0.5">
              {timestamp.toLocaleString('en-AU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <span className={`text-gray-600 text-xs transition flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </div>

      {expanded && (
        <div className="border-t border-[#1f1f1f] bg-[#080808] p-4 space-y-3">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Error</p>
            <p className="text-xs text-red-400 font-mono">{bug.error}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">💡 AI Suggestion</p>
            <p className="text-xs text-[#D4AF37] leading-relaxed">{bug.suggestion}</p>
          </div>
          {bug.status === 'open' && (
            <button
              onClick={handleMarkFixed}
              disabled={marking}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/20 transition disabled:opacity-50"
            >
              {marking && <span className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />}
              ✅ Mark Fixed
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CodeShieldPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [currentRun, setCurrentRun] = useState<RunResult | null>(null);
  const [history, setHistory] = useState<RunResult[]>([]);
  const [running, setRunning] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loadingBugs, setLoadingBugs] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Load last run from API on mount
  const loadLastRun = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const idToken = await user.getIdToken().catch(() => '');
      const res = await fetch('/api/code-shield/status', {
        headers: {
          Authorization: idToken ? `Bearer ${idToken}` : '',
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json() as { lastRun?: RunResult; history?: RunResult[] };
        if (data.lastRun) {
          setCurrentRun(data.lastRun);
        }
        if (data.history) {
          setHistory(data.history);
        }
      }
    } catch {
      // Non-fatal — page still works, just no previous data shown
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadLastRun();
    }
  }, [user, loadLastRun]);

  // Load bug reports from Firestore
  const loadBugReports = useCallback(async () => {
    setLoadingBugs(true);
    try {
      const db = getFirebaseDb();
      if (!db) return;
      const q = query(
        collection(db, 'bugReports'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      const reports: BugReport[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          error: (data.error as string) ?? 'Unknown error',
          route: (data.route as string) ?? 'unknown',
          userId: data.userId as string | null ?? null,
          timestamp: data.timestamp as BugReport['timestamp'] ?? null,
          clientTimestamp: data.clientTimestamp as string | null ?? null,
          status: (data.status as 'open' | 'fixed') ?? 'open',
          priority: (data.priority as number) ?? 5,
          suggestion: (data.suggestion as string) ?? '',
          description: data.description as string | null ?? null,
        };
      });
      setBugReports(reports);
    } catch (err) {
      console.error('[code-shield] Failed to load bug reports:', err);
    } finally {
      setLoadingBugs(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void loadBugReports();
    }
  }, [user, loadBugReports]);

  const handleMarkFixed = useCallback((id: string) => {
    setBugReports(prev => prev.map(b => b.id === id ? { ...b, status: 'fixed' } : b));
  }, []);

  // Run gates on demand
  const runGates = useCallback(async () => {
    if (!user || running) return;
    setRunning(true);
    setError(null);

    // Optimistic UI — show all gates as pending/running
    const optimistic: RunResult = {
      runId: `run-${Date.now()}`,
      startedAt: new Date().toISOString(),
      completedAt: null,
      overallStatus: 'running',
      gates: GATE_DEFINITIONS.map(g => ({ ...g, status: 'running' as GateStatus })),
    };
    setCurrentRun(optimistic);

    try {
      const idToken = await user.getIdToken().catch(() => '');
      const res = await fetch('/api/code-shield/run', {
        method: 'POST',
        headers: {
          Authorization: idToken ? `Bearer ${idToken}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: user.uid }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { run: RunResult };
      setCurrentRun(data.run);
      setHistory(prev => [data.run, ...prev.slice(0, 9)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run gates');
      // Revert optimistic UI
      setCurrentRun(prev =>
        prev
          ? {
              ...prev,
              overallStatus: 'fail',
              completedAt: new Date().toISOString(),
              gates: prev.gates.map(g => ({
                ...g,
                status: 'fail' as GateStatus,
                detail: 'Run failed — see error message',
              })),
            }
          : null
      );
    } finally {
      setRunning(false);
    }
  }, [user, running]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div role="status" aria-label="Loading" className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const passCount  = currentRun?.gates.filter(g => g.status === 'pass').length ?? 0;
  const failCount  = currentRun?.gates.filter(g => g.status === 'fail').length ?? 0;
  const totalGates = GATE_DEFINITIONS.length;
  const overallOk  = currentRun?.overallStatus === 'pass';
  const hasRun     = currentRun !== null;

  // Gates to display — use currentRun data merged with definitions for pending state
  const displayGates: GateResult[] = GATE_DEFINITIONS.map(def => {
    const found = currentRun?.gates.find(g => g.id === def.id);
    return found ?? { ...def, status: 'pending' as GateStatus };
  });

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
          <div>
            <Breadcrumb module="Code Shield" />
            <h1 className="text-xl font-black text-white">🛡️ Code Shield</h1>
            <p className="text-xs text-gray-500 mt-0.5">Automated quality gates — catch failures before they hit production</p>
          </div>
          <button
            onClick={runGates}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {running ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin flex-shrink-0" />
                Running…
              </>
            ) : (
              <>▶ Run gates</>
            )}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 w-full max-w-4xl">

          {/* ── Error banner ─────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <span className="text-red-400 flex-shrink-0">⚠️</span>
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400/50 hover:text-red-400 transition text-lg">×</button>
            </div>
          )}

          {/* ── Overall status ────────────────────────────────────────────── */}
          <section className={`rounded-2xl p-5 border transition-colors ${
            !hasRun
              ? 'bg-[#111] border-[#1f1f1f]'
              : overallOk
              ? 'bg-green-500/5 border-green-500/20'
              : running
              ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20'
              : 'bg-red-500/5 border-red-500/20'
          }`}>
            <div className="flex items-center gap-4">
              <div className="text-4xl flex-shrink-0">
                {!hasRun ? '🛡️' : running ? '⏳' : overallOk ? '✅' : '❌'}
              </div>
              <div className="flex-1">
                <p className="text-lg font-black text-white">
                  {!hasRun
                    ? 'No run yet'
                    : running
                    ? 'Running gates…'
                    : overallOk
                    ? 'All gates passed'
                    : `${failCount} gate${failCount !== 1 ? 's' : ''} failed`}
                </p>
                <p suppressHydrationWarning className="text-sm text-gray-500 mt-0.5">
                  {!hasRun
                    ? 'Hit "Run gates" to execute all quality checks'
                    : running
                    ? 'This usually takes 30–90 seconds'
                    : `${passCount}/${totalGates} passed${currentRun?.startedAt ? ` · ${formatDate(currentRun.startedAt)}` : ''}`}
                </p>
              </div>
              {hasRun && !running && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-2xl font-black text-white">{passCount}/{totalGates}</p>
                  <p className="text-xs text-gray-500">gates passed</p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {hasRun && (
              <div className="mt-4 h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${overallOk ? 'bg-green-400' : running ? 'bg-[#D4AF37]' : 'bg-red-400'}`}
                  style={{ width: `${running ? 100 : (passCount / totalGates) * 100}%` }}
                />
              </div>
            )}
          </section>

          {/* ── Gates grid ───────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Health Gates</h2>
            <div className="space-y-2">
              {loadingData && !hasRun ? (
                [1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-14 bg-[#111] border border-[#1f1f1f] rounded-xl animate-pulse" />
                ))
              ) : (
                displayGates.map(gate => (
                  <GateCard key={gate.id} gate={gate} />
                ))
              )}
            </div>
          </section>

          {/* ── What each gate checks ─────────────────────────────────────── */}
          <section>
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">What each gate checks</h2>
            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
              {[
                { icon: '🔷', label: 'TypeScript type-check',   desc: 'pnpm type-check — zero type errors across the entire codebase' },
                { icon: '🔍', label: 'ESLint',                   desc: 'pnpm lint — zero lint errors including react-hooks/exhaustive-deps' },
                { icon: '🗄️', label: 'Schema drift',             desc: 'Checks Firestore path contract — all expected fields exist in production' },
                { icon: '🔐', label: 'CVE audit',                desc: 'pnpm audit --audit-level=high — zero high or critical CVEs in dependencies' },
                { icon: '🔗', label: 'Hardcoded URL scan',       desc: 'Scans src/ for Railway URLs outside env var references — must be zero' },
                { icon: '🏗️', label: 'Build warnings',           desc: 'pnpm build — zero deprecation warnings (zero-warning policy)' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-[#1a1a1a] last:border-0">
                  <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Run history ───────────────────────────────────────────────── */}
          {history.length > 0 && (
            <section>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Run history</h2>
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
                {history.map((run, i) => (
                  <HistoryItem key={run.runId} run={run} isCurrent={i === 0} />
                ))}
              </div>
            </section>
          )}

          {/* ── Bug Reports ───────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Bug Reports</h2>
              <button
                onClick={() => void loadBugReports()}
                disabled={loadingBugs}
                className="text-xs text-gray-500 hover:text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {loadingBugs ? (
                  <span className="w-3 h-3 border border-gray-500 border-t-white rounded-full animate-spin" />
                ) : '↻'} Refresh
              </button>
            </div>

            {loadingBugs && bugReports.length === 0 ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-[#111] border border-[#1f1f1f] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : bugReports.length === 0 ? (
              <div className="bg-[#0d0d0d] border border-dashed border-[#2a2a2a] rounded-xl p-8 text-center">
                <div className="text-3xl mb-2">🐛</div>
                <p className="text-sm text-gray-500">No bug reports yet — the app is clean.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bugReports.map(bug => (
                  <BugReportCard key={bug.id} bug={bug} onMarkFixed={handleMarkFixed} />
                ))}
              </div>
            )}
          </section>

          {/* ── Deploy advice ─────────────────────────────────────────────── */}
          <section>
            <div className="bg-[#111] border border-[#1f1f1f] border-l-2 border-l-[#D4AF37]/60 rounded-2xl p-5">
              <h2 className="text-sm font-black text-white mb-3">🚀 Before you deploy</h2>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] flex-shrink-0">→</span>
                  All 6 gates must pass before merging to main
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] flex-shrink-0">→</span>
                  The pre-push hook (<code className="text-xs bg-[#1a1a1a] px-1 py-0.5 rounded text-gray-300">scripts/qa.sh</code>) runs automatically on every <code className="text-xs bg-[#1a1a1a] px-1 py-0.5 rounded text-gray-300">git push</code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] flex-shrink-0">→</span>
                  If a gate fails, fix it — never bypass with <code className="text-xs bg-[#1a1a1a] px-1 py-0.5 rounded text-gray-300">--no-verify</code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D4AF37] flex-shrink-0">→</span>
                  CVE gate: run <code className="text-xs bg-[#1a1a1a] px-1 py-0.5 rounded text-gray-300">pnpm audit --fix</code> or explicitly accept risk with Aaron&apos;s sign-off
                </li>
              </ul>
            </div>
          </section>

        </div>
      </div>
    </DashboardLayout>
  );
}
