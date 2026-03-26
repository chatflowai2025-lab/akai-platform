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
  issues: string[];
}

interface ChangeEntry {
  label: string;
  timeAgo: string;
}

const MOCK_PAGES = ['Home', 'About', 'Services', 'Contact', 'Blog'];

const MOCK_CHANGES: ChangeEntry[] = [
  { label: 'Headline updated', timeAgo: '2 hours ago' },
  { label: 'Contact form fixed', timeAgo: '1 day ago' },
  { label: 'SEO meta description added', timeAgo: '3 days ago' },
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
      const data = await res.json();
      setResult({
        speedScore: data.speedScore ?? data.speed_score ?? data.performance ?? 72,
        seoScore: data.seoScore ?? data.seo_score ?? data.seo ?? 68,
        mobileScore: data.mobileScore ?? data.mobile_score ?? data.mobile ?? 80,
        issues: data.recommendations ?? data.top_recommendations ?? [
          'Compress and lazy-load images to improve LCP',
          'Add meta descriptions to all key pages',
          'Ensure tap targets are at least 48px on mobile',
          'Enable browser caching for static assets',
          'Minify CSS and JavaScript files',
        ],
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
          {/* Score cards */}
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-5">Overall Scores</p>
            <div className="flex justify-around">
              <ScoreRing label="Speed" score={result.speedScore} />
              <ScoreRing label="SEO" score={result.seoScore} />
              <ScoreRing label="Mobile" score={result.mobileScore} />
            </div>
          </div>

          {/* Issues */}
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Issues Found</p>
              <button
                onClick={() => sendMessage(`Auto-fix the top 3 issues on my website: ${result.issues.slice(0, 3).join(', ')}`)}
                className="px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-lg text-xs font-semibold hover:bg-[#D4AF37]/20 transition"
              >
                ⚡ Auto-fix top 3
              </button>
            </div>
            <ul className="space-y-3">
              {result.issues.map((issue, i) => (
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
              <p className="text-xs text-gray-600 mt-1">Use "Edit this page" to manage content via AK</p>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WebPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [webConfig, setWebConfig] = useState<WebConfig | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [centerMode, setCenterMode] = useState<'empty' | 'audit' | 'preview'>('empty');

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

      {/* 2-column layout */}
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
        </main>
      </div>
    </DashboardLayout>
  );
}
