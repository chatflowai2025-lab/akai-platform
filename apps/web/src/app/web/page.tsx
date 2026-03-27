'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, addDoc, increment, updateDoc } from 'firebase/firestore';

const RAILWAY_API = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

// ── Types ─────────────────────────────────────────────────────────────────────
type SiteType = 'wordpress' | 'github' | 'url';
type WebTab = 'audit' | 'build';

interface WebConfig {
  type: SiteType;
  url: string;
  username?: string;
  appPassword?: string;
  token?: string;
  connected: boolean;
}

interface AuditResult {
  speedScore: number;
  seoScore: number;
  mobileScore: number;
  overallScore: number;
  ctaScore: number;
  trustScore: number;
  headline: string;
  issues: string[];
  whatsWorking: string[];
  quickWins: Array<{ action: string; impact: string; akaiModule?: string; akaiAction?: string }>;
  opportunityScore?: number;
}

interface GeneratedSite {
  headline: string;
  subheadline: string;
  about: string;
  services: { title: string; description: string }[];
  cta: string;
  metaDescription: string;
  subdomain: string;
}

type BuildStep = 1 | 2 | 3 | 4;
type ColorScheme = 'Modern Dark' | 'Clean Light' | 'Bold & Bright' | 'Natural/Earthy';

const BUSINESS_TYPES = [
  { id: 'local',        emoji: '🏠', label: 'Local Services',        desc: 'Plumber, electrician, cleaner, landscaper' },
  { id: 'professional', emoji: '🏢', label: 'Professional Services', desc: 'Lawyer, accountant, consultant, agency' },
  { id: 'retail',       emoji: '🛍️', label: 'Retail / E-commerce',   desc: 'Shop, products, online store' },
  { id: 'hospitality',  emoji: '🍽️', label: 'Hospitality',           desc: 'Restaurant, café, bar, venue' },
  { id: 'health',       emoji: '🏥', label: 'Health & Wellness',     desc: 'Gym, clinic, physio, beauty' },
  { id: 'custom',       emoji: '✨', label: 'Custom',                 desc: "Something else, I'll describe it" },
];

const COLOR_SCHEMES: ColorScheme[] = ['Modern Dark', 'Clean Light', 'Bold & Bright', 'Natural/Earthy'];

const BUILD_PROGRESS_STEPS = [
  'Choosing layout…',
  'Writing copy…',
  'Adding your details…',
  'Almost done…',
];

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#D4AF37' : '#ef4444';
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="#1f1f1f" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={radius} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-black text-white">{score}</span>
        </div>
      </div>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
    </div>
  );
}

// ── Connect Cards (inline) ────────────────────────────────────────────────────
function InlineConnectPanel({
  onConnect,
}: {
  onConnect: (cfg: WebConfig) => void;
}) {
  const [activeType, setActiveType] = useState<SiteType | null>(null);
  const [wpUrl, setWpUrl] = useState('');
  const [wpUser, setWpUser] = useState('');
  const [wpPass, setWpPass] = useState('');
  const [ghUrl, setGhUrl] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [auditUrl, setAuditUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const save = useCallback(async () => {
    let cfg: WebConfig;
    if (activeType === 'wordpress') {
      if (!wpUrl.trim()) return;
      cfg = { type: 'wordpress', url: wpUrl.trim(), username: wpUser.trim(), appPassword: wpPass.trim(), connected: true };
    } else if (activeType === 'github') {
      if (!ghUrl.trim()) return;
      cfg = { type: 'github', url: ghUrl.trim(), token: ghToken.trim(), connected: true };
    } else {
      if (!auditUrl.trim()) return;
      cfg = { type: 'url', url: auditUrl.trim(), connected: true };
    }

    setSaving(true);
    try {
      const db = getFirebaseDb();
      if (db && user) {
        await setDoc(doc(db, 'users', user.uid, 'webConfig', 'main'), cfg);
      }
      onConnect(cfg);
    } catch (e) {
      console.error('Failed to save webConfig', e);
      onConnect(cfg!);
    } finally {
      setSaving(false);
    }
  }, [activeType, wpUrl, wpUser, wpPass, ghUrl, ghToken, auditUrl, user, onConnect]);

  const toggle = (t: SiteType) => setActiveType(prev => prev === t ? null : t);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-4xl mb-6">
        🌐
      </div>
      <h2 className="text-white font-black text-2xl mb-2">Connect your site</h2>
      <p className="text-gray-400 text-sm mb-8 text-center max-w-sm">
        Connect via WordPress, GitHub, or any public URL to run an instant AI audit and surface quick wins.
      </p>

      <div className="grid grid-cols-1 gap-4 w-full max-w-2xl">
        {/* WordPress card */}
        <div className={`rounded-2xl border transition-all ${activeType === 'wordpress' ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a]'}`}>
          <button
            onClick={() => toggle('wordpress')}
            className="w-full text-left px-5 py-4 flex items-center gap-4"
          >
            <span className="text-2xl">🟦</span>
            <div className="flex-1">
              <p className={`font-bold ${activeType === 'wordpress' ? 'text-[#D4AF37]' : 'text-white'}`}>WordPress</p>
              <p className="text-xs text-gray-500">Full read/write — URL + application password</p>
            </div>
            <span className="text-gray-500 text-sm">{activeType === 'wordpress' ? '▲' : '▼'}</span>
          </button>
          {activeType === 'wordpress' && (
            <div className="px-5 pb-5 space-y-3">
              <input value={wpUrl} onChange={e => setWpUrl(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
              <input value={wpUser} onChange={e => setWpUser(e.target.value)}
                placeholder="WP Username" autoComplete="username"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
              <input value={wpPass} onChange={e => setWpPass(e.target.value)} type="password"
                placeholder="Application Password" autoComplete="current-password"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
              <a href="https://wordpress.com/support/application-passwords/" target="_blank" rel="noreferrer"
                className="block text-xs text-[#D4AF37]/70 hover:text-[#D4AF37] transition">
                How to get an app password ↗
              </a>
              <button onClick={save} disabled={saving || !wpUrl.trim()}
                className="w-full py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition">
                {saving ? 'Saving…' : 'Connect WordPress'}
              </button>
            </div>
          )}
        </div>

        {/* GitHub card */}
        <div className={`rounded-2xl border transition-all ${activeType === 'github' ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a]'}`}>
          <button
            onClick={() => toggle('github')}
            className="w-full text-left px-5 py-4 flex items-center gap-4"
          >
            <span className="text-2xl">⬛</span>
            <div className="flex-1">
              <p className={`font-bold ${activeType === 'github' ? 'text-[#D4AF37]' : 'text-white'}`}>GitHub</p>
              <p className="text-xs text-gray-500">Repo URL + personal access token</p>
            </div>
            <span className="text-gray-500 text-sm">{activeType === 'github' ? '▲' : '▼'}</span>
          </button>
          {activeType === 'github' && (
            <div className="px-5 pb-5 space-y-3">
              <input value={ghUrl} onChange={e => setGhUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
              <input value={ghToken} onChange={e => setGhToken(e.target.value)} type="password"
                placeholder="Personal Access Token" autoComplete="off"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
              <button onClick={save} disabled={saving || !ghUrl.trim()}
                className="w-full py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition">
                {saving ? 'Saving…' : 'Connect GitHub'}
              </button>
            </div>
          )}
        </div>

        {/* URL Only card */}
        <div className={`rounded-2xl border transition-all ${activeType === 'url' ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a]'}`}>
          <button
            onClick={() => toggle('url')}
            className="w-full text-left px-5 py-4 flex items-center gap-4"
          >
            <span className="text-2xl">🔍</span>
            <div className="flex-1">
              <p className={`font-bold ${activeType === 'url' ? 'text-[#D4AF37]' : 'text-white'}`}>URL Only</p>
              <p className="text-xs text-gray-500">Read-only audit — no login required</p>
            </div>
            <span className="text-gray-500 text-sm">{activeType === 'url' ? '▲' : '▼'}</span>
          </button>
          {activeType === 'url' && (
            <div className="px-5 pb-5 space-y-3">
              <p className="text-xs text-gray-500">We&apos;ll audit your site but can&apos;t make changes without credentials.</p>
              <input value={auditUrl} onChange={e => setAuditUrl(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
              <button onClick={save} disabled={saving || !auditUrl.trim()}
                className="w-full py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition">
                {saving ? 'Saving…' : 'Audit this URL'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Audit Panel ───────────────────────────────────────────────────────────────
const AUDIT_LIMITS: Record<string, number> = { trial: 3, starter: 5, growth: 20, scale: Infinity, enterprise: Infinity };
const AUDIT_LIMIT_DEFAULT = 5;

async function getAuditUsage(userId: string): Promise<{ count: number; plan: string; limit: number }> {
  try {
    const db = getFirebaseDb();
    if (!db) return { count: 0, plan: 'trial', limit: AUDIT_LIMIT_DEFAULT };
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const snap = await getDoc(doc(db, 'users', userId, 'usage', `web-audits-${month}`));
    const data = snap.exists() ? snap.data() : {};
    const userSnap = await getDoc(doc(db, 'users', userId));
    const plan = (userSnap.exists() ? userSnap.data()?.plan : 'trial') ?? 'trial';
    const limit = AUDIT_LIMITS[plan] ?? AUDIT_LIMIT_DEFAULT;
    return { count: data.count ?? 0, plan, limit };
  } catch { return { count: 0, plan: 'trial', limit: AUDIT_LIMIT_DEFAULT }; }
}

async function incrementAuditUsage(userId: string) {
  try {
    const db = getFirebaseDb();
    if (!db) return;
    const month = new Date().toISOString().slice(0, 7);
    const ref = doc(db, 'users', userId, 'usage', `web-audits-${month}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { count: increment(1), lastUsed: new Date().toISOString() });
    } else {
      await setDoc(ref, { count: 1, lastUsed: new Date().toISOString() });
    }
  } catch { /* non-fatal */ }
}

function AuditPanel({
  url,
  onDisconnect,
  userId,
}: {
  url: string;
  onDisconnect: () => void;
  userId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditUsage, setAuditUsage] = useState<{ count: number; plan: string; limit: number } | null>(null);
  // Use a ref for the notified flag — avoids re-render → useCallback recreation → useEffect re-fire loop
  const notifiedRef = useRef(false);
  const { sendMessage } = useDashboardChat();

  // Load usage on mount
  useEffect(() => {
    if (userId) getAuditUsage(userId).then(setAuditUsage);
  }, [userId]);

  const runAudit = useCallback(async () => {
    // Check usage limit
    if (userId && auditUsage && isFinite(auditUsage.limit) && auditUsage.count >= auditUsage.limit) {
      setError(`You've used all ${auditUsage.limit} web audits for this month. Upgrade to run more.`);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    notifiedRef.current = false;
    try {
      const res = await fetch(`${RAILWAY_API}/api/website-mockup/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json() as {
        scores?: { overall?: number; seo?: number; mobile?: number; cta?: number; trust?: number; speed?: number };
        speedScore?: number; speed_score?: number; performance?: number;
        seoScore?: number; seo_score?: number;
        mobileScore?: number; mobile_score?: number;
        recommendations?: string[]; top_recommendations?: string[];
        whatsWorking?: string[];
        criticalGaps?: string[];
        quickWins?: Array<{ action: string; impact: string; akaiModule?: string; akaiAction?: string }>;
        headline?: string;
        opportunityScore?: number;
      };
      const scores = data.scores ?? {};
      const gaps = data.criticalGaps ?? [];
      const wins = (data.quickWins ?? []).map(w => w.action);
      const fallbackIssues = data.recommendations ?? data.top_recommendations ?? [
        'Compress and lazy-load images to improve LCP',
        'Add meta descriptions to all key pages',
        'Ensure tap targets are at least 48px on mobile',
        'Enable browser caching for static assets',
        'Minify CSS and JavaScript files',
      ];
      const issues = [...gaps, ...wins].length > 0 ? [...gaps, ...wins] : fallbackIssues;
      const auditResult = {
        overallScore: (scores.overall ?? 0) * 10,
        speedScore: ((scores.speed ?? 0) * 10) || (data.speedScore ?? data.speed_score ?? data.performance ?? 72),
        seoScore: ((scores.seo ?? 0) * 10) || (data.seoScore ?? data.seo_score ?? 68),
        mobileScore: ((scores.mobile ?? 0) * 10) || (data.mobileScore ?? data.mobile_score ?? 80),
        ctaScore: (scores.cta ?? 0) * 10,
        trustScore: (scores.trust ?? 0) * 10,
        headline: data.headline ?? '',
        whatsWorking: data.whatsWorking ?? [],
        quickWins: data.quickWins ?? [],
        issues,
        opportunityScore: data.opportunityScore,
      };
      setResult(auditResult);
      // Track usage
      if (userId) {
        incrementAuditUsage(userId).then(() => getAuditUsage(userId).then(setAuditUsage));
      }
      // Notify via AK chat when audit completes (guarded by ref to prevent duplicate sends)
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        const overall = auditResult.overallScore || auditResult.seoScore;
        const topWin = auditResult.quickWins?.[0]?.action || auditResult.issues?.[0] || 'Check the Web skill for details';
        const msg = `🌐 **Audit complete for ${url}** — scored ${overall ? Math.round(overall) + '/100' : 'N/A'}.\n\nTop opportunity: "${topWin}"\n\n[View full report →](/web)`;
        try {
          sendMessage(msg);
        } catch { /* non-fatal */ }
        // Also push to Firestore chatNotifications so it shows even if chat panel is closed
        if (userId) {
          try {
            const db = getFirebaseDb();
            if (db) {
              await addDoc(collection(db, 'users', userId, 'chatNotifications'), {
                type: 'web_audit',
                message: msg,
                createdAt: new Date().toISOString(),
                read: false,
              });
            }
          } catch { /* non-fatal */ }
        }
      }
    } catch {
      setError("Couldn't reach the audit service. Check the URL and try again.");
    } finally {
      setLoading(false);
    }
  }, [url, userId, sendMessage, auditUsage]);

  useEffect(() => { runAudit(); }, [runAudit]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Top bar — site status */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[#1f1f1f] bg-[#0a0a0a] flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
        <span className="text-sm text-gray-300 font-medium truncate flex-1">{url}</span>
        {auditUsage && isFinite(auditUsage.limit) && (
          <span className={`text-xs px-2 py-1 rounded-lg border ${auditUsage.count >= auditUsage.limit ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-white/30 bg-white/5 border-white/10'}`}>
            {auditUsage.count}/{auditUsage.limit} audits
          </span>
        )}
        <button
          onClick={runAudit}
          disabled={loading || (!!auditUsage && isFinite(auditUsage.limit) && auditUsage.count >= auditUsage.limit)}
          className="px-4 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-xl text-sm hover:border-[#D4AF37]/30 hover:text-white disabled:opacity-40 transition flex-shrink-0"
        >
          {loading ? '⏳ Auditing…' : '🔄 Re-audit'}
        </button>
        <button
          onClick={onDisconnect}
          className="text-xs text-gray-600 hover:text-red-400 transition flex-shrink-0"
        >
          Disconnect
        </button>
      </div>

      {/* Prominent status banners — shown at the very top, impossible to miss */}
      {loading && (
        <div className="flex-shrink-0 px-6 pt-4">
          <style>{`
            @keyframes auditProgress {
              0% { width: 0%; }
              30% { width: 40%; }
              60% { width: 70%; }
              85% { width: 88%; }
              100% { width: 95%; }
            }
          `}</style>
          <div className="rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg">🔍</span>
              <div>
                <p className="text-sm font-bold text-[#D4AF37]">Auditing {url}…</p>
                <p className="text-xs text-gray-400 mt-0.5">This takes 10–20 seconds. AK will also notify you in chat when done.</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div className="h-full bg-[#D4AF37] rounded-full" style={{ animation: 'auditProgress 15s ease-in-out forwards' }} />
            </div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="flex-shrink-0 px-6 pt-4">
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex items-start gap-3">
            <span className="text-lg flex-shrink-0">❌</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-400">Audit failed</p>
              <p className="text-xs text-red-300/70 mt-0.5">{error}</p>
            </div>
            <button
              onClick={runAudit}
              className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition flex-shrink-0"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="flex-shrink-0 px-6 pt-4">
          <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 flex items-center gap-3">
            <span className="text-lg flex-shrink-0">✅</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-green-400">
                Audit complete — scored {Math.round(result.overallScore || result.seoScore)}/100
              </p>
              <p className="text-xs text-green-300/60 mt-0.5">Full report below. Re-audit anytime to track improvements.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={runAudit}
                className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg text-xs font-semibold hover:bg-green-500/30 transition"
              >
                Re-audit
              </button>
              <button
                onClick={onDisconnect}
                className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-lg text-xs font-semibold hover:text-red-400 hover:border-red-500/30 transition"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 max-w-sm mx-auto text-center">
            <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-sm text-white font-semibold">Analysing your site…</p>
              <p className="text-xs text-gray-500 mt-1">Hang tight — detailed results coming up.</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {result && (
          <>
            {/* Headline banner */}
            {result.headline && (
              <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-6 py-5">
                <p className="text-[#D4AF37] font-semibold text-base">{result.headline}</p>
              </div>
            )}

            {/* Opportunity Score — big red number */}
            {result.opportunityScore != null && result.opportunityScore > 0 && (
              <div className="text-center py-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                <p className="text-3xl font-black text-red-400">{result.opportunityScore}%</p>
                <p className="text-xs text-gray-500 mt-1">of visitors estimated to leave without contacting you</p>
              </div>
            )}

            {/* Score rings — 3-col grid */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-6">Site Scores</p>
              <div className="grid grid-cols-3 gap-8 sm:grid-cols-5">
                {result.overallScore > 0 && <ScoreRing label="Overall" score={result.overallScore} />}
                <ScoreRing label="SEO" score={result.seoScore} />
                <ScoreRing label="Mobile" score={result.mobileScore} />
                {result.ctaScore > 0 && <ScoreRing label="CTA" score={result.ctaScore} />}
                {result.trustScore > 0 && <ScoreRing label="Trust" score={result.trustScore} />}
              </div>
            </div>

            {/* What's Working */}
            {result.whatsWorking.length > 0 && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">✅ What&apos;s Working</p>
                <ul className="space-y-3">
                  {result.whatsWorking.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Wins */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
                {result.quickWins.length > 0 ? '⚡ Quick Wins' : 'Issues Found'}
              </p>
              <ul className="space-y-4">
                {result.quickWins.length > 0 ? result.quickWins.map((win, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200">{win.action}</p>
                      {win.impact && <p className="text-xs text-green-400 mt-1">→ {win.impact}</p>}
                    </div>
                    {win.akaiModule && win.akaiAction ? (
                      <a
                        href={`/${win.akaiModule.toLowerCase().replace(' ', '-')}`}
                        className="flex-shrink-0 px-2.5 py-1 bg-[#D4AF37] text-black text-xs rounded-lg font-bold hover:opacity-90 transition"
                      >
                        {win.akaiAction} →
                      </a>
                    ) : (
                      <button
                        onClick={() => navigator.clipboard?.writeText(win.action)}
                        className="flex-shrink-0 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-gray-400 rounded-lg hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition"
                      >
                        Fix this
                      </button>
                    )}
                  </li>
                )) : result.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-gray-300">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Build Tab ─────────────────────────────────────────────────────────────────
function BuildTab() {
  const { user } = useAuth();

  const [step, setStep] = useState<BuildStep>(1);
  const [selectedType, setSelectedType] = useState<string>('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [tagline, setTagline] = useState('');
  const [services, setServices] = useState(['', '', '']);
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [contactPhone, setContactPhone] = useState('');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('Modern Dark');
  const [progressStep, setProgressStep] = useState(0);
  const [generatedSite, setGeneratedSite] = useState<GeneratedSite | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const updateService = (idx: number, val: string) => {
    setServices(prev => prev.map((s, i) => i === idx ? val : s));
  };

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    const found = BUSINESS_TYPES.find(t => t.id === typeId);
    if (found && found.id !== 'custom') {
      setIndustry(found.label);
    }
    setStep(2);
  };

  const handleGenerate = async () => {
    if (!businessName.trim()) return;
    setStep(3);
    setBuildError(null);
    setProgressStep(0);

    const interval = setInterval(() => {
      setProgressStep(prev => {
        if (prev >= BUILD_PROGRESS_STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 900);

    try {
      const res = await fetch('/api/web/generate-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType: selectedType,
          businessName: businessName.trim(),
          industry: industry.trim(),
          location: location.trim(),
          tagline: tagline.trim(),
          services: services.filter(Boolean),
          contactEmail,
          contactPhone,
          colorScheme,
        }),
      });

      clearInterval(interval);
      setProgressStep(BUILD_PROGRESS_STEPS.length - 1);

      if (!res.ok) throw new Error(`Build failed (${res.status})`);
      const data = await res.json() as GeneratedSite;
      await new Promise(r => setTimeout(r, 600));
      setGeneratedSite(data);
      setStep(4);
    } catch (err) {
      clearInterval(interval);
      setBuildError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep(2);
    }
  };

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="flex flex-col h-full overflow-y-auto p-6">
        <div className="mb-6">
          <h2 className="text-white font-bold text-xl">Build your website</h2>
          <p className="text-gray-400 text-sm mt-1">Powered by AK — live in minutes. What kind of business is it?</p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-2xl">
          {BUSINESS_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => handleTypeSelect(type.id)}
              className="text-left p-4 rounded-2xl border border-[#2a2a2a] bg-[#111] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition-all group"
            >
              <div className="text-2xl mb-2">{type.emoji}</div>
              <p className="text-white font-semibold text-sm group-hover:text-[#D4AF37] transition-colors">{type.label}</p>
              <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{type.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  if (step === 2) {
    const selectedTypeData = BUSINESS_TYPES.find(t => t.id === selectedType);
    return (
      <div className="flex flex-col h-full overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep(1)} className="text-gray-500 hover:text-white transition text-sm">← Back</button>
          <div>
            <h2 className="text-white font-bold text-xl">
              {selectedTypeData?.emoji} {selectedTypeData?.label}
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">Tell us about your business</p>
          </div>
        </div>

        {buildError && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">{buildError}</div>
        )}

        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Business name <span className="text-red-400">*</span></label>
            <input value={businessName} onChange={e => setBusinessName(e.target.value)}
              placeholder="e.g. Smith & Sons Plumbing"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Industry / type</label>
            <input value={industry} onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. Plumbing, accounting, fitness…"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Sydney, NSW"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">
              Tagline <span className="ml-2 text-gray-600 font-normal">(AK will suggest one if blank)</span>
            </label>
            <input value={tagline} onChange={e => setTagline(e.target.value)}
              placeholder="e.g. Fast. Reliable. Local."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Key services (up to 3)</label>
            <div className="space-y-2">
              {services.map((svc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-gray-500 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <input value={svc} onChange={e => updateService(i, e.target.value)}
                    placeholder={`Service ${i + 1}`}
                    className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Contact email</label>
              <input value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                placeholder="you@example.com" type="email"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Phone</label>
              <input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                placeholder="+61 400 000 000" type="tel"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Colour preference</label>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_SCHEMES.map(scheme => (
                <button key={scheme} onClick={() => setColorScheme(scheme)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    colorScheme === scheme
                      ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-[#2a2a2a] bg-[#111] text-gray-400 hover:border-[#3a3a3a] hover:text-white'
                  }`}>
                  {scheme}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleGenerate} disabled={!businessName.trim()}
            className="w-full py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 disabled:opacity-40 transition mt-2">
            Generate my website →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3 ──────────────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-[#1a1a1a] border border-[#D4AF37]/20 flex items-center justify-center text-4xl">🏗️</div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0a0a0a] border-2 border-[#D4AF37] flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-white font-bold text-xl mb-1">AK is building your site</h2>
          <p className="text-[#D4AF37] text-sm font-medium min-h-[1.5rem]">{BUILD_PROGRESS_STEPS[progressStep]}</p>
        </div>
        <div className="flex gap-2">
          {BUILD_PROGRESS_STEPS.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i <= progressStep ? 'bg-[#D4AF37]' : 'bg-[#2a2a2a]'}`} />
          ))}
        </div>
      </div>
    );
  }

  // ── Step 4 ──────────────────────────────────────────────────────────────────
  if (step === 4 && generatedSite) {
    const siteServices = generatedSite.services.length > 0
      ? generatedSite.services
      : services.filter(Boolean).map(s => ({ title: s, description: '' }));

    return (
      <div className="flex flex-col h-full overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-bold text-xl">✨ Your website is ready</h2>
            <p className="text-gray-400 text-sm mt-0.5">Preview below — publish when you&apos;re happy</p>
          </div>
          <button onClick={() => { setStep(1); setGeneratedSite(null); setIsPublished(false); }}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-sm hover:text-white transition">
            Start over
          </button>
        </div>

        <div className="rounded-2xl border border-[#2a2a2a] overflow-hidden mb-6 max-w-2xl">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] px-8 py-10 border-b border-[#2a2a2a]">
            <div className="inline-block px-2.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-medium mb-4">{businessName}</div>
            <h3 className="text-white font-black text-2xl leading-tight mb-2">{generatedSite.headline}</h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-lg mb-6">{generatedSite.subheadline}</p>
            <button className="px-5 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold">{generatedSite.cta}</button>
          </div>
          <div className="px-8 py-6 border-b border-[#2a2a2a] bg-[#0d0d0d]">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Services</p>
            <div className="grid grid-cols-3 gap-4">
              {siteServices.slice(0, 3).map((svc, i) => (
                <div key={i} className="bg-[#111] rounded-xl p-4 border border-[#1f1f1f]">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-sm mb-3">{['⚡', '🎯', '✅'][i]}</div>
                  <p className="text-white text-sm font-semibold mb-1">{svc.title}</p>
                  {svc.description && <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{svc.description}</p>}
                </div>
              ))}
            </div>
          </div>
          <div className="px-8 py-5 bg-[#111]">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Contact</p>
            <div className="flex gap-6 text-sm text-gray-400">
              {contactEmail && <span>📧 {contactEmail}</span>}
              {contactPhone && <span>📞 {contactPhone}</span>}
              {location && <span>📍 {location}</span>}
            </div>
          </div>
        </div>

        <div className="max-w-2xl space-y-3">
          {!isPublished ? (
            <>
              <button
                onClick={async () => {
                  if (!user || !generatedSite) return;
                  setPublishing(true);
                  setPublishError(null);
                  try {
                    // Get Firebase ID token so the server can write to Firestore
                    // when Firebase Admin SDK service account creds aren't in env
                    let idToken: string | undefined;
                    try {
                      const { getAuth } = await import('firebase/auth');
                      const { getFirebaseApp } = await import('@/lib/firebase');
                      const app = getFirebaseApp();
                      if (app) {
                        const fbAuth = getAuth(app);
                        if (fbAuth.currentUser) {
                          idToken = await fbAuth.currentUser.getIdToken();
                        }
                      }
                    } catch {
                      // non-fatal — server will try Admin SDK first
                    }
                    const res = await fetch('/api/web/publish', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        subdomain: generatedSite.subdomain,
                        userId: user.uid,
                        site: { ...generatedSite, businessName, colorScheme },
                        idToken,
                      }),
                    });
                    if (!res.ok) throw new Error('Publish failed');
                    setIsPublished(true);
                  } catch {
                    setPublishError('Failed to publish. Please try again.');
                  } finally {
                    setPublishing(false);
                  }
                }}
                disabled={publishing}
                className="w-full py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 disabled:opacity-60 transition"
              >
                {publishing ? '⏳ Publishing…' : `🚀 Publish to ${generatedSite.subdomain}.getakai.ai`}
              </button>
              {publishError && (
                <p className="text-red-400 text-xs text-center">{publishError}</p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 px-5 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <span className="text-green-400 text-lg">✅</span>
              <div>
                <p className="text-green-400 font-semibold text-sm">Your site is live!</p>
                <p className="text-green-400/70 text-xs">
                  <a href={`https://${generatedSite.subdomain}.getakai.ai`} target="_blank" rel="noreferrer" className="hover:text-green-400 underline">
                    {generatedSite.subdomain}.getakai.ai
                  </a>
                </p>
              </div>
            </div>
          )}
          <div className="p-4 bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">SEO Meta Description</p>
            <p className="text-xs text-gray-400 leading-relaxed">{generatedSite.metaDescription}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }: { active: WebTab; onChange: (t: WebTab) => void }) {
  const tabs: { id: WebTab; label: string }[] = [
    { id: 'audit', label: '🔍 Audit' },
    { id: 'build', label: '🏗️ Build' },
  ];

  return (
    <div className="flex items-center gap-1 px-6 py-3 border-b border-[#1f1f1f] bg-[#080808] flex-shrink-0">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            active === tab.id
              ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]'
              : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a] border border-transparent'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WebPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [webConfig, setWebConfig] = useState<WebConfig | null>(null);
  const [activeTab, setActiveTab] = useState<WebTab>('audit');

  // Load saved webConfig
  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) return;
    getDoc(doc(db, 'users', user.uid, 'webConfig', 'main'))
      .then(snap => {
        if (snap.exists()) {
          setWebConfig(snap.data() as WebConfig);
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const handleConnect = useCallback((cfg: WebConfig) => {
    setWebConfig(cfg);
  }, []);

  const handleDisconnect = useCallback(async () => {
    setWebConfig(null);
    if (!user) return;
    try {
      const db = getFirebaseDb();
      if (db) {
        const { deleteDoc, doc: fsDoc } = await import('firebase/firestore');
        await deleteDoc(fsDoc(db, 'users', user.uid, 'webConfig', 'main'));
      }
    } catch {
      // non-fatal
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#1f1f1f] bg-[#080808] flex-shrink-0">
        <div>
          <h1 className="text-lg font-black text-white">Web</h1>
          <p className="text-xs text-gray-500 mt-0.5">AI-powered website manager</p>
        </div>

      </header>

      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <TabBar active={activeTab} onChange={setActiveTab} />

        <main className="flex-1 bg-[#080808] overflow-hidden flex flex-col min-w-0">
          {activeTab === 'build' && <BuildTab />}

          {activeTab === 'audit' && (
            <>
              {!webConfig?.connected ? (
                <InlineConnectPanel onConnect={handleConnect} />
              ) : (
                <AuditPanel url={webConfig.url} onDisconnect={handleDisconnect} userId={user.uid} />
              )}
            </>
          )}
        </main>
      </div>
    </DashboardLayout>
  );
}
