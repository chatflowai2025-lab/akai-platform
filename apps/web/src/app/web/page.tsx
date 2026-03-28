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
type WebTab = 'audit' | 'build' | 'history' | 'compare';

interface AuditHistoryEntry {
  id: string;
  url: string;
  date: string;
  score: number;
  topIssue: string;
}

function loadAuditHistory(): AuditHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem('akai_audit_history');
    return s ? (JSON.parse(s) as AuditHistoryEntry[]) : [];
  } catch { return []; }
}

function saveAuditHistory(entries: AuditHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem('akai_audit_history', JSON.stringify(entries.slice(0, 50))); } catch { /* non-fatal */ }
}

function appendAuditHistory(entry: AuditHistoryEntry) {
  const existing = loadAuditHistory();
  const filtered = existing.filter(e => e.url !== entry.url);
  saveAuditHistory([entry, ...filtered]);
}

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
      // Save to audit history
      appendAuditHistory({
        id: Date.now().toString(),
        url,
        date: new Date().toISOString().split('T')[0] ?? '',
        score: Math.round(auditResult.overallScore || auditResult.seoScore),
        topIssue: auditResult.quickWins?.[0]?.action ?? auditResult.issues?.[0] ?? '',
      } as AuditHistoryEntry);
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
                onClick={() => {
                  // Export as .txt report
                  const score = Math.round(result.overallScore || result.seoScore);
                  const lines = [
                    `AKAI Web Audit Report`,
                    `=====================`,
                    `URL: ${url}`,
                    `Date: ${new Date().toLocaleDateString('en-AU')}`,
                    ``,
                    `SCORES`,
                    `------`,
                    result.overallScore > 0 ? `Overall:  ${Math.round(result.overallScore)}/100` : '',
                    `SEO:      ${result.seoScore}/100`,
                    `Mobile:   ${result.mobileScore}/100`,
                    result.ctaScore > 0 ? `CTA:      ${Math.round(result.ctaScore)}/100` : '',
                    result.trustScore > 0 ? `Trust:    ${Math.round(result.trustScore)}/100` : '',
                    ``,
                    `OVERALL SCORE: ${score}/100`,
                    ``,
                  ];
                  if (result.headline) lines.push(`SUMMARY`, `-------`, result.headline, ``);
                  if (result.whatsWorking.length > 0) {
                    lines.push(`WHAT'S WORKING`, `--------------`);
                    result.whatsWorking.forEach(w => lines.push(`✓ ${w}`));
                    lines.push(``);
                  }
                  if (result.quickWins.length > 0) {
                    lines.push(`QUICK WINS`, `----------`);
                    result.quickWins.forEach((w, i) => {
                      lines.push(`${i + 1}. ${w.action}`);
                      if (w.impact) lines.push(`   → ${w.impact}`);
                    });
                    lines.push(``);
                  } else if (result.issues.length > 0) {
                    lines.push(`ISSUES FOUND`, `------------`);
                    result.issues.forEach((issue, i) => lines.push(`${i + 1}. ${issue}`));
                    lines.push(``);
                  }
                  lines.push(`---`, `Generated by AKAI — getakai.ai`);
                  const blob = new Blob([lines.filter(l => l !== undefined).join('\n')], { type: 'text/plain' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `akai-audit-${url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
                className="px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg text-xs font-semibold hover:bg-[#D4AF37]/20 transition"
              >
                📄 Export
              </button>
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

// ── Site Preview (Step 4) ─────────────────────────────────────────────────────
interface SitePreviewProps {
  generatedSite: GeneratedSite;
  businessName: string;
  industry: string;
  location: string;
  colorScheme: ColorScheme;
  contactEmail: string;
  contactPhone: string;
  services: string[];
  user: ReturnType<typeof useAuth>['user'];
  onStartOver: () => void;
}

const SITE_PREVIEW_HINTS = [
  { icon: '💡', tip: 'Did you know? Websites with clear CTAs convert 3x better than those without.' },
  { icon: '🔍', tip: "Did you know? 75% of users judge a business's credibility by their website design." },
  { icon: '📱', tip: 'Did you know? Your site auto-adapts for mobile — no extra work needed.' },
  { icon: '⚡', tip: 'Did you know? AK can update your site copy anytime — just ask in chat.' },
  { icon: '🎯', tip: 'Did you know? Sites with local keywords rank 2x higher in Google for local searches.' },
  { icon: '🚀', tip: 'Tip: Once published, your site is live at your subdomain in under 30 seconds.' },
  { icon: '🤖', tip: 'Tip: AK can add new services, change your headline, or swap colours — just tell it what you want.' },
];

function SitePreview({ generatedSite, businessName, industry, location, colorScheme, contactEmail, contactPhone, services, user, onStartOver }: SitePreviewProps) {
  const siteServices = generatedSite.services.length > 0
    ? generatedSite.services
    : services.filter(Boolean).map(s => ({ title: s, description: '' }));

  type PaletteKey = 'bg' | 'text' | 'accent' | 'nav' | 'card' | 'border' | 'sub';
  const palettes: Record<ColorScheme, Record<PaletteKey, string>> = {
    'Modern Dark':    { bg: '#0a0a0a', text: '#ffffff', accent: '#D4AF37', nav: '#111111', card: '#1a1a1a', border: '#2a2a2a', sub: '#9ca3af' },
    'Clean Light':    { bg: '#ffffff', text: '#111111', accent: '#2563eb', nav: '#f8fafc', card: '#f1f5f9', border: '#e2e8f0', sub: '#6b7280' },
    'Bold & Bright':  { bg: '#0f172a', text: '#f8fafc', accent: '#38bdf8', nav: '#1e293b', card: '#1e293b', border: '#334155', sub: '#94a3b8' },
    'Natural/Earthy': { bg: '#faf7f2', text: '#1c1917', accent: '#b45309', nav: '#f5f0e8', card: '#ede9df', border: '#d6cfc4', sub: '#78716c' },
  };
  const p = palettes[colorScheme] ?? palettes['Modern Dark'];

  const [hintIdx, setHintIdx] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');
  const [isPublished, setIsPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setHintIdx(i => (i + 1) % SITE_PREVIEW_HINTS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const scrollToSection = (id: string) => {
    const el = previewRef.current?.querySelector(`#preview-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  const aboutParas = generatedSite.about
    ? generatedSite.about.split('\n\n').filter(Boolean)
    : [`${businessName} is a trusted provider of ${industry} based in ${location}.`, 'We work closely with every client to understand their goals and exceed expectations.'];

  const handlePublish = async () => {
    if (!user || !generatedSite) return;
    setPublishing(true);
    setPublishError(null);
    try {
      let idToken: string | undefined;
      try {
        const { getAuth } = await import('firebase/auth');
        const { getFirebaseApp } = await import('@/lib/firebase');
        const app = getFirebaseApp();
        if (app) {
          const fbAuth = getAuth(app);
          if (fbAuth.currentUser) idToken = await fbAuth.currentUser.getIdToken();
        }
      } catch { /* non-fatal */ }
      const res = await fetch('/api/web/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: generatedSite.subdomain, userId: user.uid, site: { ...generatedSite, businessName, colorScheme }, idToken }),
      });
      if (!res.ok) throw new Error('Publish failed');
      setIsPublished(true);
    } catch {
      setPublishError('Failed to publish. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#1f1f1f] flex-shrink-0">
        <div>
          <h2 className="text-white font-bold text-base">✨ Your website is ready</h2>
          <p className="text-gray-500 text-xs mt-0.5">Scroll to preview every section · publish when you&apos;re happy</p>
        </div>
        <button onClick={onStartOver} className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-lg text-xs hover:text-white transition">
          Start over
        </button>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* TOP/LEFT: full website preview */}
        <div ref={previewRef} className="flex-1 overflow-y-auto min-h-0" style={{ background: '#0d0d0d' }}>
          {/* Browser chrome */}
          <div className="sticky top-0 z-20 flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <div className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-md px-3 py-1 text-xs text-gray-500 text-center truncate">
              🔒 {generatedSite.subdomain}.getakai.ai
            </div>
          </div>

          {/* Rendered website */}
          <div style={{ background: p.bg, color: p.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>

            {/* Sticky nav */}
            <nav className="sticky top-[40px] z-10" style={{ background: p.nav, borderBottom: `1px solid ${p.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px' }}>
              <span style={{ color: p.accent, fontWeight: 900, fontSize: 20 }}>{businessName}</span>
              <div style={{ display: 'flex', gap: 24 }}>
                {['Services', 'About', 'Contact'].map(s => (
                  <button key={s} onClick={() => scrollToSection(s.toLowerCase())}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: activeSection === s.toLowerCase() ? p.accent : p.sub, fontWeight: 500, fontSize: 14 }}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={() => scrollToSection('contact')}
                style={{ background: p.accent, color: p.bg, padding: '10px 22px', borderRadius: 10, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                Get in Touch
              </button>
            </nav>

            {/* Hero */}
            <div id="preview-hero" style={{ padding: '96px 32px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 999, background: `${p.accent}18`, border: `1px solid ${p.accent}30`, color: p.accent, fontSize: 12, fontWeight: 600, marginBottom: 24 }}>
                {industry}{location ? ` · ${location}` : ''}
              </div>
              <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, lineHeight: 1.05, color: p.text, marginBottom: 20 }}>
                {generatedSite.headline}
              </h1>
              <p style={{ fontSize: 18, color: p.sub, maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6 }}>
                {generatedSite.subheadline}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => scrollToSection('contact')}
                  style={{ background: p.accent, color: p.bg, padding: '14px 32px', borderRadius: 12, fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer' }}>
                  {generatedSite.cta} →
                </button>
                <button onClick={() => scrollToSection('services')}
                  style={{ background: 'transparent', color: p.text, padding: '14px 32px', borderRadius: 12, fontWeight: 600, fontSize: 16, border: `1px solid ${p.border}`, cursor: 'pointer' }}>
                  See our services
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, marginTop: 56, flexWrap: 'wrap' }}>
                {['Trusted locally', 'Fast response', 'Results guaranteed'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: p.sub }}>
                    <span style={{ color: p.accent }}>✓</span> {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Services */}
            <div id="preview-services" style={{ background: p.card, padding: '72px 32px', borderTop: `1px solid ${p.border}` }}>
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <p style={{ color: p.accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>What we do</p>
                <h2 style={{ fontSize: 36, fontWeight: 900, color: p.text, margin: 0 }}>Our Services</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto' }}>
                {siteServices.slice(0, 3).map((svc, i) => (
                  <div key={i} style={{ background: p.bg, borderRadius: 16, padding: 28, border: `1px solid ${p.border}` }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${p.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>
                      {['⚡', '🎯', '✅'][i]}
                    </div>
                    <h3 style={{ fontWeight: 800, fontSize: 17, color: p.text, marginBottom: 8 }}>{svc.title}</h3>
                    <p style={{ color: p.sub, fontSize: 14, lineHeight: 1.6 }}>{svc.description || `Professional ${svc.title.toLowerCase()} tailored to your needs.`}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* About */}
            <div id="preview-about" style={{ padding: '72px 32px' }}>
              <div style={{ maxWidth: 840, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
                <div>
                  <p style={{ color: p.accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>About us</p>
                  <h2 style={{ fontSize: 30, fontWeight: 900, color: p.text, marginBottom: 20, lineHeight: 1.2 }}>Built on trust, driven by results</h2>
                  {aboutParas.map((para, i) => (
                    <p key={i} style={{ color: p.sub, fontSize: 15, lineHeight: 1.7, marginBottom: 14 }}>{para}</p>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[{ n: '10+', l: 'Years experience' }, { n: '500+', l: 'Happy clients' }, { n: '98%', l: 'Satisfaction rate' }, { n: '24/7', l: 'Support' }].map(s => (
                    <div key={s.l} style={{ background: p.card, border: `1px solid ${p.border}`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: p.accent }}>{s.n}</div>
                      <div style={{ fontSize: 12, color: p.sub, marginTop: 4 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA banner */}
            <div style={{ background: p.accent, padding: '56px 32px', textAlign: 'center' }}>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: p.bg, marginBottom: 12 }}>Ready to get started?</h2>
              <p style={{ color: `${p.bg}aa`, fontSize: 16, marginBottom: 28 }}>Join hundreds of businesses growing with {businessName}.</p>
              <button onClick={() => scrollToSection('contact')}
                style={{ background: p.bg, color: p.accent, padding: '14px 36px', borderRadius: 12, fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer' }}>
                {generatedSite.cta} →
              </button>
            </div>

            {/* Contact / Footer */}
            <div id="preview-contact" style={{ background: p.nav, padding: '56px 32px', borderTop: `1px solid ${p.border}` }}>
              <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: p.text, marginBottom: 8 }}>Get in touch</h2>
                <p style={{ color: p.sub, fontSize: 15, marginBottom: 28 }}>We&apos;d love to hear from you. Reach out and we&apos;ll respond quickly.</p>
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', fontSize: 14, color: p.sub }}>
                  {contactEmail && <span>📧 {contactEmail}</span>}
                  {contactPhone && <span>📞 {contactPhone}</span>}
                  {location && <span>📍 {location}</span>}
                </div>
                <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${p.border}`, color: p.sub, fontSize: 12 }}>
                  © {new Date().getFullYear()} {businessName} · Built with AKAI
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM/RIGHT: sidebar — Publish always pinned top, rest scrolls */}
        <div className="w-full lg:w-72 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-[#1f1f1f] flex flex-col bg-[#0a0a0a] overflow-hidden max-h-64 lg:max-h-none">

          {/* Publish — always visible, never scrolls away */}
          <div className="p-4 border-b border-[#1f1f1f] flex-shrink-0">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Publish</p>
            {!isPublished ? (
              <>
                <button onClick={handlePublish} disabled={publishing}
                  className="w-full py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 disabled:opacity-60 transition">
                  {publishing ? '⏳ Publishing…' : '🚀 Publish live'}
                </button>
                <p className="text-xs text-gray-600 text-center mt-1">{generatedSite.subdomain}.getakai.ai</p>
                {publishError && <p className="text-red-400 text-xs text-center mt-2">{publishError}</p>}
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                <span className="text-green-400">✅</span>
                <div>
                  <p className="text-green-400 font-semibold text-xs">Live!</p>
                  <a href={`https://${generatedSite.subdomain}.getakai.ai`} target="_blank" rel="noreferrer" className="text-green-400/70 text-xs hover:text-green-400 underline">
                    {generatedSite.subdomain}.getakai.ai
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Section nav + SEO + hints — scrollable */}
          <div className="flex-1 overflow-y-auto">

          {/* Section nav */}
          <div className="p-4 border-b border-[#1f1f1f]">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Jump to section</p>
            <div className="space-y-1">
              {[{ id: 'hero', label: '🏠 Hero' }, { id: 'services', label: '⚡ Services' }, { id: 'about', label: '👥 About' }, { id: 'contact', label: '📧 Contact' }].map(s => (
                <button key={s.id} onClick={() => scrollToSection(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${activeSection === s.id ? 'bg-[#D4AF37]/10 text-[#D4AF37] font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* SEO preview */}
          <div className="p-4 border-b border-[#1f1f1f]">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">SEO Preview</p>
            <div className="bg-[#0d0d0d] rounded-xl p-3 border border-[#1f1f1f]">
              <p className="text-blue-400 text-xs font-medium truncate">{generatedSite.subdomain}.getakai.ai</p>
              <p className="text-white text-xs font-semibold mt-1 leading-snug line-clamp-2">{generatedSite.headline}</p>
              <p className="text-green-600 text-[10px] mt-0.5 line-clamp-3 leading-relaxed">{generatedSite.metaDescription}</p>
            </div>
          </div>

          {/* Rotating hints */}
          <div className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Tips &amp; Hints</p>
            <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3 min-h-[80px] transition-all duration-500">
              <span className="text-lg">{SITE_PREVIEW_HINTS[hintIdx]?.icon}</span>
              <p className="text-gray-300 text-xs leading-relaxed mt-1">{SITE_PREVIEW_HINTS[hintIdx]?.tip}</p>
            </div>
            <div className="flex gap-1 justify-center mt-2 mb-4">
              {SITE_PREVIEW_HINTS.map((_, i) => (
                <button key={i} onClick={() => setHintIdx(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === hintIdx ? 'bg-[#D4AF37] w-4' : 'bg-[#2a2a2a] w-1.5'}`} />
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-2.5 bg-[#111] border border-[#1f1f1f] rounded-xl">
                <span className="text-sm flex-shrink-0 mt-0.5">🎨</span>
                <p className="text-gray-500 text-xs leading-relaxed">Not happy with colours? Tell AK in chat — it can regenerate with any palette.</p>
              </div>
              <div className="flex items-start gap-2 p-2.5 bg-[#111] border border-[#1f1f1f] rounded-xl">
                <span className="text-sm flex-shrink-0 mt-0.5">✏️</span>
                <p className="text-gray-500 text-xs leading-relaxed">Want to change the headline? Hit Start over — takes 20 seconds.</p>
              </div>
            </div>
          </div>
          </div>{/* end scrollable section */}
        </div>
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
    return (
      <SitePreview
        generatedSite={generatedSite}
        businessName={businessName}
        industry={industry}
        location={location}
        colorScheme={colorScheme}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        services={services}
        user={user}
        onStartOver={() => { setStep(1); setGeneratedSite(null); }}
      />
    );
  }

  return null;
}

// ── Audit History Tab ─────────────────────────────────────────────────────────
function HistoryTab() {
  const [history, setHistory] = useState<AuditHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadAuditHistory());
  }, []);

  const clearHistory = () => {
    saveAuditHistory([]);
    setHistory([]);
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="text-5xl">📋</div>
        <h2 className="text-white font-bold text-lg">No audit history yet</h2>
        <p className="text-gray-500 text-sm max-w-xs">Run your first audit from the Audit tab — results will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#1f1f1f] bg-[#0a0a0a] flex-shrink-0">
        <p className="text-xs text-gray-500">{history.length} audit{history.length !== 1 ? 's' : ''} saved</p>
        <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 transition">Clear history</button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3 max-w-2xl mx-auto">
          {history.map(entry => {
            const color = entry.score >= 80 ? 'text-green-400' : entry.score >= 60 ? 'text-yellow-400' : 'text-red-400';
            const bgColor = entry.score >= 80 ? 'bg-green-500/10 border-green-500/20' : entry.score >= 60 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20';
            return (
              <div key={entry.id} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${bgColor} border flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-lg font-black ${color}`}>{entry.score}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{entry.url}</p>
                  {entry.topIssue && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">Top issue: {entry.topIssue}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-600">{entry.date}</p>
                  <p className={`text-xs font-bold ${color} mt-0.5`}>{entry.score}/100</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Competitor Compare Tab ────────────────────────────────────────────────────
interface CompareResult {
  url: string;
  score: number;
  topIssues: string[];
  loading: boolean;
  error: string | null;
}

function CompareTab() {
  const { user } = useAuth();
  const [myUrl, setMyUrl] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [results, setResults] = useState<[CompareResult | null, CompareResult | null]>([null, null]);
  const [running, setRunning] = useState(false);

  const runCompare = async () => {
    if (!myUrl.trim() || !competitorUrl.trim()) return;
    setRunning(true);
    setResults([
      { url: myUrl.trim(), score: 0, topIssues: [], loading: true, error: null },
      { url: competitorUrl.trim(), score: 0, topIssues: [], loading: true, error: null },
    ]);

    const runOne = async (url: string): Promise<CompareResult> => {
      try {
        const res = await fetch(`${RAILWAY_API}/api/website-mockup/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json() as {
          scores?: { overall?: number; seo?: number };
          seoScore?: number;
          quickWins?: Array<{ action: string }>;
          criticalGaps?: string[];
          recommendations?: string[];
        };
        const scores = data.scores ?? {};
        const overall = (scores.overall ?? 0) * 10 || data.seoScore || 65;
        const rawWins = data.quickWins?.map(w => w.action) ?? data.criticalGaps ?? data.recommendations ?? [];
        return { url, score: Math.round(overall), topIssues: rawWins.slice(0, 3), loading: false, error: null };
      } catch {
        return { url, score: 0, topIssues: [], loading: false, error: 'Audit failed — check URL and try again' };
      }
    };

    // Run both in parallel
    const [r1, r2] = await Promise.all([runOne(myUrl.trim()), runOne(competitorUrl.trim())]);
    setResults([r1, r2]);
    setRunning(false);

    // Save both to history
    if (r1.score > 0) appendAuditHistory({ id: `${Date.now()}-my`, url: r1.url, date: new Date().toISOString().split('T')[0], score: r1.score, topIssue: r1.topIssues[0] ?? '' } as AuditHistoryEntry);
    if (r2.score > 0) appendAuditHistory({ id: `${Date.now()}-comp`, url: r2.url, date: new Date().toISOString().split('T')[0], score: r2.score, topIssue: r2.topIssues[0] ?? '' } as AuditHistoryEntry);
  };

  // Silence unused user warning
  void user;

  const renderCol = (r: CompareResult | null, label: string) => {
    if (!r) return (
      <div className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 flex items-center justify-center">
        <p className="text-gray-700 text-sm">{label}</p>
      </div>
    );
    const color = r.score >= 80 ? '#22c55e' : r.score >= 60 ? '#D4AF37' : '#ef4444';
    return (
      <div className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-sm font-semibold text-white truncate">{r.url}</p>
        </div>
        {r.loading ? (
          <div className="flex items-center gap-2 py-4">
            <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500">Auditing…</span>
          </div>
        ) : r.error ? (
          <p className="text-xs text-red-400">{r.error}</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center border" style={{ backgroundColor: `${color}15`, borderColor: `${color}40` }}>
                <span className="text-2xl font-black" style={{ color }}>{r.score}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Overall Score</p>
                <p className="text-lg font-black text-white">{r.score}<span className="text-gray-600 text-sm">/100</span></p>
              </div>
            </div>
            {r.topIssues.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2">Top Issues</p>
                <ul className="space-y-2">
                  {r.topIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-red-400 flex-shrink-0 mt-0.5">{i + 1}.</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto w-full">
        <h2 className="text-white font-bold text-lg mb-1">Competitor Comparison</h2>
        <p className="text-gray-500 text-sm mb-6">Enter your URL and a competitor URL to see a side-by-side score breakdown.</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Your URL</label>
            <input
              value={myUrl}
              onChange={e => setMyUrl(e.target.value)}
              placeholder="https://yoursite.com"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Competitor URL</label>
            <input
              value={competitorUrl}
              onChange={e => setCompetitorUrl(e.target.value)}
              placeholder="https://competitor.com"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>
        </div>

        <button
          onClick={runCompare}
          disabled={running || !myUrl.trim() || !competitorUrl.trim()}
          className="w-full py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition mb-6 flex items-center justify-center gap-2"
        >
          {running ? (
            <><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Comparing…</>
          ) : '⚡ Compare Now'}
        </button>

        {(results[0] || results[1]) && (
          <div className="flex gap-4">
            {renderCol(results[0], 'Your Site')}
            {renderCol(results[1], 'Competitor')}
          </div>
        )}

        {results[0] && results[1] && !results[0].loading && !results[1].loading && !results[0].error && !results[1].error && (
          <div className="mt-4 p-4 bg-[#111] border border-[#1f1f1f] rounded-xl">
            {results[0].score > results[1].score ? (
              <p className="text-green-400 text-sm font-semibold">✅ Your site outscores the competitor by {results[0].score - results[1].score} points.</p>
            ) : results[1].score > results[0].score ? (
              <p className="text-yellow-400 text-sm font-semibold">⚠️ Competitor leads by {results[1].score - results[0].score} points — quick wins above can close the gap.</p>
            ) : (
              <p className="text-gray-300 text-sm font-semibold">🤝 Tied score — focus on quick wins to pull ahead.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }: { active: WebTab; onChange: (t: WebTab) => void }) {
  const tabs: { id: WebTab; label: string }[] = [
    { id: 'audit', label: '🔍 Audit' },
    { id: 'build', label: '🏗️ Build' },
    { id: 'history', label: '📋 History' },
    { id: 'compare', label: '⚔️ Compare' },
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

          {activeTab === 'history' && <HistoryTab />}

          {activeTab === 'compare' && <CompareTab />}

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
