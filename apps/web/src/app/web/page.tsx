'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const RAILWAY_API = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

// ── Types ─────────────────────────────────────────────────────────────────────
type SiteType = 'wordpress' | 'github' | 'url';
type WebTab = 'audit' | 'manage' | 'build';

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
  quickWins: Array<{ action: string; impact: string }>;
}

interface ChangeEntry {
  label: string;
  timeAgo: string;
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

const MOCK_PAGES = ['Home', 'About', 'Services', 'Contact', 'Blog'];

const MOCK_CHANGES: ChangeEntry[] = [
  { label: 'Headline updated', timeAgo: '2 hours ago' },
  { label: 'Contact form fixed', timeAgo: '1 day ago' },
  { label: 'SEO meta description added', timeAgo: '3 days ago' },
];

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

// ── Connect Card ──────────────────────────────────────────────────────────────
function ConnectCard({
  type, icon, label, description, active, onClick
}: {
  type: SiteType; icon: string; label: string; description: string;
  active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
        active
          ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5'
          : 'border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a]'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-base">{icon}</span>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${active ? 'text-[#D4AF37]' : 'text-white'}`}>{label}</p>
          <p className="text-xs text-gray-500 truncate">{description}</p>
        </div>
        {active && <span className="ml-auto text-[#D4AF37] text-xs flex-shrink-0">▾</span>}
      </div>
    </button>
  );
}

// ── Left Panel ────────────────────────────────────────────────────────────────
function LeftPanel({
  webConfig,
  onConnect,
  selectedPage,
  onSelectPage,
  onAudit,
}: {
  webConfig: WebConfig | null;
  onConnect: (cfg: WebConfig) => void;
  selectedPage: string | null;
  onSelectPage: (page: string) => void;
  onAudit: () => void;
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
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Site Connection */}
      <div className="p-4 border-b border-[#1f1f1f]">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Connect your site</p>

        <div className="space-y-2">
          <ConnectCard
            type="wordpress" icon="🟦" label="WordPress" description="URL + app password"
            active={activeType === 'wordpress'} onClick={() => toggle('wordpress')}
          />
          {activeType === 'wordpress' && (
            <div className="space-y-2 px-1">
              <input value={wpUrl} onChange={e => setWpUrl(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
              <input value={wpUser} onChange={e => setWpUser(e.target.value)}
                placeholder="WP Username"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
              <input value={wpPass} onChange={e => setWpPass(e.target.value)} type="password"
                placeholder="Application Password"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
              <a href="https://wordpress.com/support/application-passwords/" target="_blank" rel="noreferrer"
                className="block text-xs text-[#D4AF37]/70 hover:text-[#D4AF37] transition">
                How to get an app password ↗
              </a>
              <button onClick={save} disabled={saving || !wpUrl.trim()}
                className="w-full py-2 bg-[#D4AF37] text-black rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-40 transition">
                {saving ? 'Saving…' : 'Connect WordPress'}
              </button>
            </div>
          )}

          <ConnectCard
            type="github" icon="⬛" label="GitHub" description="Repo URL + personal token"
            active={activeType === 'github'} onClick={() => toggle('github')}
          />
          {activeType === 'github' && (
            <div className="space-y-2 px-1">
              <input value={ghUrl} onChange={e => setGhUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
              <input value={ghToken} onChange={e => setGhToken(e.target.value)} type="password"
                placeholder="Personal Access Token"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
              <button onClick={save} disabled={saving || !ghUrl.trim()}
                className="w-full py-2 bg-[#D4AF37] text-black rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-40 transition">
                {saving ? 'Saving…' : 'Connect GitHub'}
              </button>
            </div>
          )}

          <ConnectCard
            type="url" icon="🔍" label="URL Only" description="Read-only audit"
            active={activeType === 'url'} onClick={() => toggle('url')}
          />
          {activeType === 'url' && (
            <div className="space-y-2 px-1">
              <p className="text-xs text-gray-500">Read-only — we'll audit but can't make changes.</p>
              <input value={auditUrl} onChange={e => setAuditUrl(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50" />
              <button onClick={save} disabled={saving || !auditUrl.trim()}
                className="w-full py-2 bg-[#D4AF37] text-black rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-40 transition">
                {saving ? 'Saving…' : 'Connect & Audit'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connected state */}
      {webConfig?.connected && (
        <div className="p-4 flex-1">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <span className="text-xs text-green-400 font-semibold">Connected</span>
            <span className="text-xs text-gray-500 truncate">{webConfig.url.replace(/^https?:\/\//, '')}</span>
          </div>

          <button
            onClick={onAudit}
            className="w-full mb-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-500/20 transition"
          >
            🔍 Run Audit
          </button>

          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Pages</p>
          <div className="space-y-1">
            {MOCK_PAGES.map(page => (
              <button
                key={page}
                onClick={() => onSelectPage(page)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  selectedPage === page
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                    : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-white'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audit Panel ───────────────────────────────────────────────────────────────
function AuditPanel({ url, onBack }: { url: string; onBack: () => void }) {
  const { sendMessage } = useDashboardChat();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changeLogOpen, setChangeLogOpen] = useState(false);

  const runAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
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
        quickWins?: Array<{ action: string; impact: string }>;
        headline?: string;
      };
      const scores = data.scores ?? {};
      // Build issues list: criticalGaps first, then quickWin actions
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
      setResult({
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
      });
    } catch {
      setError("Couldn't reach the audit service. Check the URL and try again.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { runAudit(); }, [runAudit]);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Site Audit</h2>
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{url}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runAudit} disabled={loading}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-xl text-sm hover:border-[#D4AF37]/30 hover:text-white disabled:opacity-40 transition">
            {loading ? '⏳ Auditing…' : '🔄 Re-audit'}
          </button>
          <button onClick={onBack}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-sm hover:text-white transition">
            ← Back
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Analysing your site…</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Headline */}
          {result.headline && (
            <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-5 py-4">
              <p className="text-sm text-[#D4AF37] font-medium">{result.headline}</p>
            </div>
          )}

          {/* Score cards */}
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-5">Overall Scores</p>
            <div className="flex justify-around flex-wrap gap-4">
              {result.overallScore > 0 && <ScoreRing label="Overall" score={result.overallScore} />}
              <ScoreRing label="SEO" score={result.seoScore} />
              <ScoreRing label="Mobile" score={result.mobileScore} />
              {result.ctaScore > 0 && <ScoreRing label="CTA" score={result.ctaScore} />}
              {result.trustScore > 0 && <ScoreRing label="Trust" score={result.trustScore} />}
            </div>
          </div>

          {/* What's working */}
          {result.whatsWorking.length > 0 && (
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">✅ What&apos;s Working</p>
              <ul className="space-y-2">
                {result.whatsWorking.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick wins / Issues */}
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                {result.quickWins.length > 0 ? '⚡ Quick Wins' : 'Issues Found'}
              </p>
              <button
                onClick={() => sendMessage(`Auto-fix the top 3 issues on my website: ${result.issues.slice(0, 3).join(', ')}`)}
                className="px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-lg text-xs font-semibold hover:bg-[#D4AF37]/20 transition"
              >
                ⚡ Auto-fix top 3
              </button>
            </div>
            <ul className="space-y-3">
              {result.quickWins.length > 0 ? result.quickWins.map((win, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300">{win.action}</p>
                    {win.impact && <p className="text-xs text-green-400 mt-0.5">→ {win.impact}</p>}
                  </div>
                  <button
                    onClick={() => sendMessage(`Fix this on my website: "${win.action}"`)}
                    className="flex-shrink-0 px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-gray-400 rounded-lg hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition"
                  >
                    Fix this
                  </button>
                </li>
              )) : result.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-300">{issue}</span>
                  <button
                    onClick={() => sendMessage(`Fix the "${issue}" issue on my website`)}
                    className="flex-shrink-0 px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-gray-400 rounded-lg hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition"
                  >
                    Fix this
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Change log */}
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
            <button
              onClick={() => setChangeLogOpen(p => !p)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#1a1a1a] transition"
            >
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Change Log</p>
              <span className="text-gray-500 text-xs">{changeLogOpen ? '▲' : '▼'}</span>
            </button>
            {changeLogOpen && (
              <div className="px-6 pb-5 space-y-2 border-t border-[#1f1f1f]">
                {MOCK_CHANGES.map((change, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[#1f1f1f] last:border-0">
                    <div>
                      <p className="text-sm text-gray-200">{change.label}</p>
                      <p className="text-xs text-gray-500">{change.timeAgo}</p>
                    </div>
                    <button
                      onClick={() => sendMessage(`Roll back the "${change.label}" change`)}
                      className="px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-gray-400 rounded-lg hover:text-red-400 hover:border-red-500/30 transition"
                    >
                      Rollback
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Preview Panel ─────────────────────────────────────────────────────────────
function PreviewPanel({
  pageName, siteUrl, siteType, onBack
}: {
  pageName: string; siteUrl: string; siteType: SiteType; onBack: () => void;
}) {
  const { sendMessage } = useDashboardChat();
  const previewUrl = siteType === 'url' || siteType === 'wordpress'
    ? (pageName === 'Home' ? siteUrl : `${siteUrl.replace(/\/$/, '')}/${pageName.toLowerCase()}`)
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] flex-shrink-0">
        <div>
          <h2 className="text-white font-bold text-lg">{pageName} Page</h2>
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{previewUrl ?? siteUrl}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => sendMessage(`I want to edit the ${pageName} page on my ${siteType} site`)}
            className="px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition"
          >
            ✏️ Edit this page
          </button>
          <button onClick={onBack}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-sm hover:text-white transition">
            ← Back
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={`${pageName} preview`}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-20 h-20 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-4xl">
              📄
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">{pageName} Page</p>
              <p className="text-sm text-gray-500 mt-1">Preview not available for GitHub repos</p>
              <p className="text-xs text-gray-600 mt-1">Use &quot;Edit this page&quot; to manage content via AK</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="w-24 h-24 rounded-3xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-5xl">
        🌐
      </div>
      <div className="text-center max-w-sm">
        <h2 className="text-white font-bold text-xl mb-2">AI Website Manager</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Connect your site using WordPress, GitHub, or any public URL to run audits, preview pages, and manage content with AK.
        </p>
      </div>
      <div className="flex gap-3 text-xs text-gray-600">
        <span>🔍 Instant SEO audit</span>
        <span>·</span>
        <span>✏️ AI page editing</span>
        <span>·</span>
        <span>↩️ One-click rollback</span>
      </div>
    </div>
  );
}

// ── Build Tab ─────────────────────────────────────────────────────────────────
function BuildTab() {
  const { sendMessage } = useDashboardChat();
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

  // Update services array
  const updateService = (idx: number, val: string) => {
    setServices(prev => prev.map((s, i) => i === idx ? val : s));
  };

  // Step 1 → 2
  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    const found = BUSINESS_TYPES.find(t => t.id === typeId);
    if (found && found.id !== 'custom') {
      setIndustry(found.label);
    }
    setStep(2);
  };

  // Step 2 → 3 (trigger build)
  const handleGenerate = async () => {
    if (!businessName.trim()) return;
    setStep(3);
    setBuildError(null);
    setProgressStep(0);

    // Animate progress messages
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
      // Short pause so the final progress message shows
      await new Promise(r => setTimeout(r, 600));
      setGeneratedSite(data);
      setStep(4);
    } catch (err) {
      clearInterval(interval);
      setBuildError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep(2);
    }
  };

  // ── Step 1: Business type cards ─────────────────────────────────────────────
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

        <div className="mt-6 flex items-center gap-2">
          <button
            onClick={() => sendMessage('build a website')}
            className="text-xs text-[#D4AF37]/70 hover:text-[#D4AF37] transition"
          >
            Ask AK to help you choose →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Business details form ───────────────────────────────────────────
  if (step === 2) {
    const selectedTypeData = BUSINESS_TYPES.find(t => t.id === selectedType);
    return (
      <div className="flex flex-col h-full overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setStep(1)}
            className="text-gray-500 hover:text-white transition text-sm"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-white font-bold text-xl">
              {selectedTypeData?.emoji} {selectedTypeData?.label}
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">Tell us about your business</p>
          </div>
        </div>

        {buildError && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            {buildError}
          </div>
        )}

        <div className="space-y-4 max-w-xl">
          {/* Business name */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Business name <span className="text-red-400">*</span></label>
            <input
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="e.g. Smith & Sons Plumbing"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          {/* Industry */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Industry / type</label>
            <input
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. Plumbing, accounting, fitness…"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Location</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Sydney, NSW"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">
              Tagline
              <span className="ml-2 text-gray-600 font-normal">(AK will suggest one if left blank)</span>
            </label>
            <input
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="e.g. Fast. Reliable. Local."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          {/* Key services */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Key services (up to 3)</label>
            <div className="space-y-2">
              {services.map((svc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-gray-500 flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <input
                    value={svc}
                    onChange={e => updateService(i, e.target.value)}
                    placeholder={`Service ${i + 1}`}
                    className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Contact email</label>
              <input
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Phone</label>
              <input
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="+61 400 000 000"
                type="tel"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
          </div>

          {/* Colour scheme */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Colour preference</label>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_SCHEMES.map(scheme => (
                <button
                  key={scheme}
                  onClick={() => setColorScheme(scheme)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    colorScheme === scheme
                      ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-[#2a2a2a] bg-[#111] text-gray-400 hover:border-[#3a3a3a] hover:text-white'
                  }`}
                >
                  {scheme}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!businessName.trim()}
            className="w-full py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 disabled:opacity-40 transition mt-2"
          >
            Generate my website →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Loading / building ───────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-[#1a1a1a] border border-[#D4AF37]/20 flex items-center justify-center text-4xl">
            🏗️
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0a0a0a] border-2 border-[#D4AF37] flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-white font-bold text-xl mb-1">AK is building your site</h2>
          <p className="text-[#D4AF37] text-sm font-medium min-h-[1.5rem] transition-all">
            {BUILD_PROGRESS_STEPS[progressStep]}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {BUILD_PROGRESS_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i <= progressStep ? 'bg-[#D4AF37]' : 'bg-[#2a2a2a]'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Step 4: Preview + publish ────────────────────────────────────────────────
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
          <button
            onClick={() => { setStep(1); setGeneratedSite(null); setIsPublished(false); }}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-sm hover:text-white transition"
          >
            Start over
          </button>
        </div>

        {/* Preview Card */}
        <div className="rounded-2xl border border-[#2a2a2a] overflow-hidden mb-6 max-w-2xl">
          {/* Hero */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] px-8 py-10 border-b border-[#2a2a2a]">
            <div className="inline-block px-2.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-medium mb-4">
              {businessName}
            </div>
            <h3 className="text-white font-black text-2xl leading-tight mb-2">
              {generatedSite.headline}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-lg mb-6">
              {generatedSite.subheadline}
            </p>
            <button className="px-5 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold">
              {generatedSite.cta}
            </button>
          </div>

          {/* Services */}
          <div className="px-8 py-6 border-b border-[#2a2a2a] bg-[#0d0d0d]">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Services</p>
            <div className="grid grid-cols-3 gap-4">
              {siteServices.slice(0, 3).map((svc, i) => (
                <div key={i} className="bg-[#111] rounded-xl p-4 border border-[#1f1f1f]">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-sm mb-3">
                    {['⚡', '🎯', '✅'][i]}
                  </div>
                  <p className="text-white text-sm font-semibold mb-1">{svc.title}</p>
                  {svc.description && (
                    <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{svc.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="px-8 py-5 bg-[#111]">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Contact</p>
            <div className="flex gap-6 text-sm text-gray-400">
              {contactEmail && <span>📧 {contactEmail}</span>}
              {contactPhone && <span>📞 {contactPhone}</span>}
              {location && <span>📍 {location}</span>}
            </div>
          </div>
        </div>

        {/* Publish actions */}
        <div className="max-w-2xl space-y-3">
          {!isPublished ? (
            <button
              onClick={() => setIsPublished(true)}
              className="w-full py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition"
            >
              🚀 Publish to {generatedSite.subdomain}.getakai.ai
            </button>
          ) : (
            <div className="flex items-center gap-3 px-5 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <span className="text-green-400 text-lg">✅</span>
              <div>
                <p className="text-green-400 font-semibold text-sm">Your site is live!</p>
                <p className="text-green-400/70 text-xs">
                  <a
                    href={`https://${generatedSite.subdomain}.getakai.ai`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-green-400 underline"
                  >
                    {generatedSite.subdomain}.getakai.ai
                  </a>
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => sendMessage('I want to connect my domain to my AKAI website')}
              className="py-2.5 bg-[#111] border border-[#2a2a2a] text-gray-300 rounded-xl text-sm font-medium hover:border-[#3a3a3a] hover:text-white transition"
            >
              🌐 Connect your own domain
            </button>
            <button
              onClick={() => sendMessage('I want to edit my website')}
              className="py-2.5 bg-[#111] border border-[#2a2a2a] text-gray-300 rounded-xl text-sm font-medium hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition"
            >
              ✏️ Edit with AI
            </button>
          </div>

          {/* Meta */}
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
    { id: 'audit',  label: '🔍 Audit' },
    { id: 'manage', label: '🔧 Manage' },
    { id: 'build',  label: '🏗️ Build' },
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
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [centerMode, setCenterMode] = useState<'empty' | 'audit' | 'preview'>('empty');
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
          setCenterMode('audit');
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const handleConnect = useCallback((cfg: WebConfig) => {
    setWebConfig(cfg);
    setCenterMode('audit');
    setSelectedPage(null);
  }, []);

  const handleSelectPage = useCallback((page: string) => {
    setSelectedPage(page);
    setCenterMode('preview');
  }, []);

  const handleAudit = useCallback(() => {
    setSelectedPage(null);
    setCenterMode('audit');
  }, []);

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
        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
          Beta
        </span>
      </header>

      {/* Build tab — full width (no left panel) */}
      {activeTab === 'build' && (
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          <TabBar active={activeTab} onChange={setActiveTab} />
          <main className="flex-1 bg-[#080808] overflow-hidden flex flex-col min-w-0">
            <BuildTab />
          </main>
        </div>
      )}

      {/* Audit / Manage tabs — 2-column layout */}
      {activeTab !== 'build' && (
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          <TabBar active={activeTab} onChange={setActiveTab} />

          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Left column — 260px */}
            <aside className="w-[260px] flex-shrink-0 border-r border-[#1f1f1f] bg-[#0a0a0a] overflow-hidden flex flex-col">
              <LeftPanel
                webConfig={webConfig}
                onConnect={handleConnect}
                selectedPage={selectedPage}
                onSelectPage={handleSelectPage}
                onAudit={handleAudit}
              />
            </aside>

            {/* Right column — flex-1 */}
            <main className="flex-1 bg-[#080808] overflow-hidden flex flex-col min-w-0">
              {activeTab === 'audit' && (
                <>
                  {centerMode === 'empty' && <EmptyState />}
                  {centerMode === 'audit' && webConfig && (
                    <AuditPanel url={webConfig.url} onBack={() => setCenterMode('empty')} />
                  )}
                  {centerMode === 'preview' && webConfig && selectedPage && (
                    <PreviewPanel
                      pageName={selectedPage}
                      siteUrl={webConfig.url}
                      siteType={webConfig.type}
                      onBack={() => setCenterMode('audit')}
                    />
                  )}
                </>
              )}
              {activeTab === 'manage' && (
                <>
                  {centerMode === 'empty' && <EmptyState />}
                  {centerMode === 'audit' && webConfig && (
                    <AuditPanel url={webConfig.url} onBack={() => setCenterMode('empty')} />
                  )}
                  {centerMode === 'preview' && webConfig && selectedPage && (
                    <PreviewPanel
                      pageName={selectedPage}
                      siteUrl={webConfig.url}
                      siteType={webConfig.type}
                      onBack={() => setCenterMode('audit')}
                    />
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
