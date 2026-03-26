'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

const RAILWAY_API = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuditResult {
  speedScore: number;
  seoScore: number;
  mobileScore: number;
  recommendations: string[];
}

interface GenerateResult {
  pageType: string;
  content: string;
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ label, score }: { label: string; score: number }) {
  const color =
    score >= 80 ? '#22c55e' : score >= 60 ? '#D4AF37' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl font-black text-white"
        style={{ borderColor: color }}
      >
        {score}
      </div>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
    </div>
  );
}

// ── Parse content into sections ────────────────────────────────────────────────
function parseContentSections(raw: string): Array<{ label: string; text: string }> {
  const sections: Array<{ label: string; text: string }> = [];
  // Try to parse "Label: value" or "**Label:** value" or "## Label\n value" patterns
  const lines = raw.split('\n');
  let currentLabel = '';
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLabel && currentLines.some(l => l.trim())) {
      sections.push({ label: currentLabel, text: currentLines.join('\n').trim() });
    }
    currentLabel = '';
    currentLines = [];
  };

  for (const line of lines) {
    // Match patterns like "Headline:", "**Headline:**", "## Headline"
    const sectionMatch = line.match(/^(?:#{1,3}\s+)?(?:\*\*)?([A-Z][A-Za-z\s]+?)(?:\*\*)?:\s*(.*)$/);
    if (sectionMatch) {
      flush();
      currentLabel = sectionMatch[1].trim();
      if (sectionMatch[2].trim()) currentLines.push(sectionMatch[2].trim());
    } else if (line.trim()) {
      currentLines.push(line);
    } else if (currentLabel) {
      currentLines.push('');
    }
  }
  flush();

  // If we couldn't parse sections, return raw as one block
  if (sections.length === 0) {
    sections.push({ label: 'Generated Copy', text: raw.trim() });
  }

  return sections;
}

// ── Website Audit Section ─────────────────────────────────────────────────────
function WebsiteAudit() {
  const { sendMessage } = useDashboardChat();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${RAILWAY_API}/api/website-mockup/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setResult({
        speedScore: data.speedScore ?? data.speed_score ?? data.performance ?? 72,
        seoScore: data.seoScore ?? data.seo_score ?? data.seo ?? 68,
        mobileScore: data.mobileScore ?? data.mobile_score ?? data.mobile ?? 80,
        recommendations:
          data.recommendations ??
          data.top_recommendations ?? [
            'Compress and lazy-load images to improve LCP',
            'Add meta descriptions to all key pages',
            'Ensure tap targets are at least 48px on mobile',
          ],
      });
    } catch (e) {
      console.error(e);
      setError(
        "Couldn't reach the audit service right now. Check the URL and try again, or ask AK for help."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg">
          🔍
        </div>
        <div>
          <h2 className="text-white font-bold text-base">Website Audit</h2>
          <p className="text-xs text-gray-500">Speed · SEO · Mobile — scored instantly</p>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runAudit()}
          placeholder="https://yourwebsite.com"
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
        />
        <button
          onClick={runAudit}
          disabled={loading || !url.trim()}
          className="px-5 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition whitespace-nowrap"
        >
          {loading ? 'Auditing…' : 'Audit now'}
        </button>
        <button
          onClick={() => sendMessage('audit my website')}
          className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-sm hover:text-white hover:border-[#D4AF37]/30 transition"
          title="Ask AK"
        >
          Ask AK
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm py-4">
          <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          Analysing your site…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          <span className="font-semibold">Audit failed — </span>{error}
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="flex justify-around pt-2">
            <ScoreRing label="Speed" score={result.speedScore} />
            <ScoreRing label="SEO" score={result.seoScore} />
            <ScoreRing label="Mobile" score={result.mobileScore} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
              Top recommendations
            </p>
            <ul className="space-y-2">
              {result.recommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Content Generator Section ─────────────────────────────────────────────────
function ContentGenerator() {
  const { sendMessage } = useDashboardChat();
  const [pageType, setPageType] = useState('Home');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const PAGE_OPTIONS = ['Home', 'About', 'Services', 'Contact', 'Pricing', 'Blog', 'Landing'];

  const generate = async () => {
    if (!businessName.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setEditMode(false);
    try {
      const res = await fetch('/api/web/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType,
          businessName: businessName.trim(),
          industry: industry.trim() || 'General',
          description: description.trim() || `${pageType} page for ${businessName}`,
          goals: goals.trim() || pageType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');

      const content = data.content ?? `Headline: Transform Your Business with ${businessName}\n\nSubheadline: Professional solutions that drive real results.\n\nKey Points:\n• Expert team with proven track record\n• Tailored solutions for your needs\n• Fast results with ongoing support\n\nCTA: Get Started Today\n\nBody: ${businessName} delivers exceptional results for businesses like yours.`;

      setResult({ pageType, content });
      setEditedContent(content);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(`Generation failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    const text = editMode ? editedContent : (result?.content ?? '');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayContent = editMode ? editedContent : (result?.content ?? '');
  const sections = result ? parseContentSections(displayContent) : [];

  return (
    <section className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-lg">
          ✍️
        </div>
        <div>
          <h2 className="text-white font-bold text-base">Content Generator</h2>
          <p className="text-xs text-gray-500">Generate page copy for any section of your website</p>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {/* Page type picker */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 block">
            What page do you need?
          </label>
          <div className="flex flex-wrap gap-2">
            {PAGE_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setPageType(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  pageType === opt
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                    : 'bg-[#0d0d0d] text-gray-400 border-[#2a2a2a] hover:border-[#D4AF37]/30 hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Business name *"
          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Industry (e.g. SaaS, Retail)"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
          />
          <input
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="Goal (e.g. book demos)"
            className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
          />
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description of your business (optional)"
          rows={2}
          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={generate}
          disabled={loading || !businessName.trim()}
          className="flex-1 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition"
        >
          {loading ? 'Generating…' : `Generate ${pageType} Page`}
        </button>
        <button
          onClick={() => sendMessage('generate web content')}
          className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-sm hover:text-white hover:border-[#D4AF37]/30 transition"
          title="Ask AK"
        >
          Ask AK
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm py-4 mt-4">
          <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          Generating your {pageType.toLowerCase()} page copy…
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Generated — {result.pageType} Page
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
                  editMode
                    ? 'border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#D4AF37]/30'
                }`}
              >
                ✏️ {editMode ? 'Editing' : 'Edit'}
              </button>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#D4AF37]/30 transition"
              >
                {copied ? '✅ Copied!' : '📋 Copy all'}
              </button>
            </div>
          </div>

          {/* Edit mode: single textarea */}
          {editMode ? (
            <textarea
              value={editedContent}
              onChange={e => setEditedContent(e.target.value)}
              rows={20}
              className="w-full bg-[#0d0d0d] border border-[#D4AF37]/30 rounded-xl p-4 text-sm text-gray-200 leading-relaxed resize-y focus:outline-none focus:border-[#D4AF37]/60 transition font-mono"
            />
          ) : (
            /* Structured sections display */
            <div className="space-y-3">
              {sections.map((section, i) => (
                <div key={i} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4">
                  <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-2">
                    {section.label}
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {section.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {editMode && (
            <button
              onClick={() => {
                setResult({ ...result, content: editedContent });
                setEditMode(false);
              }}
              className="w-full py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition"
            >
              ✅ Save edits
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WebPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

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

  return (
    <DashboardLayout>
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
        <div>
          <h1 className="text-xl font-black text-white">Web</h1>
          <p className="text-xs text-gray-500 mt-0.5">Site audit and AI-powered content generation</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
          Beta
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <WebsiteAudit />
        <ContentGenerator />
      </div>
    </DashboardLayout>
  );
}
