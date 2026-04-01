'use client';

import { useState, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

type SeoTab = 'keywords' | 'audit' | 'brief';

interface Keyword {
  keyword: string;
  intent: 'informational' | 'commercial' | 'transactional';
  difficulty: 'low' | 'medium' | 'high';
  rationale: string;
}

interface AuditFix {
  priority: number;
  issue: string;
  fix: string;
}

interface AuditResult {
  url: string;
  score: number;
  signals: {
    hasTitle: boolean;
    titleLength: number;
    titleText: string;
    hasMetaDesc: boolean;
    metaDescLength: number;
    metaDescText: string;
    h1Count: number;
    h1Text: string;
    imagesTotal: number;
    imagesWithAlt: number;
    internalLinks: number;
    hasSchema: boolean;
    wordCount: number;
    loadTimeSignal: string;
  };
  fixes: AuditFix[];
  summary: string;
}

interface H2Section {
  heading: string;
  notes: string;
}

interface ContentBrief {
  keyword: string;
  title: string;
  metaDescription: string;
  wordCountTarget: number;
  h2Structure: H2Section[];
  semanticKeywords: string[];
  cta: string;
  contentGoal: string;
  targetAudience: string;
}

const intentColors = {
  informational: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  commercial: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  transactional: 'bg-green-500/10 text-green-400 border-green-500/20',
};

const difficultyColors = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-red-400',
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#D4AF37' : '#ef4444';
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="#1f1f1f" strokeWidth="8" />
        <circle
          cx="48" cy="48" r="40" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${(score / 100) * 251} 251`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
      </svg>
      <span className="text-2xl font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

export default function SeoPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<SeoTab>('keywords');

  // Keywords state
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [keywordsError, setKeywordsError] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState('');

  // Audit state
  const [auditUrl, setAuditUrl] = useState('');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');

  // Content brief state
  const [briefKeyword, setBriefKeyword] = useState('');
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState('');
  const [briefCopied, setBriefCopied] = useState(false);

  const getToken = useCallback(async () => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  }, [user]);

  const handleKeywordSearch = async () => {
    if (!businessType.trim()) return;
    setKeywordsLoading(true);
    setKeywordsError('');
    try {
      const token = await getToken();
      const res = await fetch('/api/seo/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessType, location }),
      });
      const data = await res.json() as { keywords?: Keyword[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate keywords');
      setKeywords(data.keywords ?? []);
    } catch (err) {
      setKeywordsError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setKeywordsLoading(false);
    }
  };

  const handleAudit = async () => {
    if (!auditUrl.trim()) return;
    setAuditLoading(true);
    setAuditError('');
    setAuditResult(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/seo/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: auditUrl }),
      });
      const data = await res.json() as AuditResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Audit failed');
      setAuditResult(data);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleGenerateBrief = async () => {
    if (!briefKeyword.trim()) return;
    setBriefLoading(true);
    setBriefError('');
    setBrief(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/seo/content-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ keyword: briefKeyword, businessType, location }),
      });
      const data = await res.json() as { brief?: ContentBrief; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate brief');
      setBrief(data.brief ?? null);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBriefLoading(false);
    }
  };

  const handleUseBriefKeyword = (kw: string) => {
    setSelectedKeyword(kw);
    setBriefKeyword(kw);
    setTab('brief');
  };

  const copyBrief = () => {
    if (!brief) return;
    const text = [
      `SEO Content Brief: ${brief.keyword}`,
      '',
      `Title: ${brief.title}`,
      `Meta: ${brief.metaDescription}`,
      `Word count target: ${brief.wordCountTarget}`,
      `Target audience: ${brief.targetAudience}`,
      `Content goal: ${brief.contentGoal}`,
      '',
      'H2 Structure:',
      ...brief.h2Structure.map((h, i) => `  ${i + 1}. ${h.heading}\n     ${h.notes}`),
      '',
      `Semantic keywords: ${brief.semanticKeywords.join(', ')}`,
      '',
      `CTA: ${brief.cta}`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setBriefCopied(true);
      setTimeout(() => setBriefCopied(false), 2000);
    });
  };

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔍</span>
          <div>
            <h1 className="text-2xl font-bold text-white">SEO</h1>
            <p className="text-sm text-gray-400">Keyword research, page audits, and content briefs — all AI-powered</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#111] rounded-xl p-1 w-fit">
          {([
            { id: 'keywords', label: '🎯 Keywords' },
            { id: 'audit', label: '📋 Audit' },
            { id: 'brief', label: '📝 Content Brief' },
          ] as { id: SeoTab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-[#D4AF37] text-black'
                  : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Keywords Tab ── */}
        {tab === 'keywords' && (
          <div className="space-y-5">
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 space-y-4">
              <h2 className="text-white font-semibold">Keyword Research</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Business type *</label>
                  <input
                    value={businessType}
                    onChange={e => setBusinessType(e.target.value)}
                    placeholder="e.g. plumber, dentist, digital agency"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Location (optional)</label>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Sydney, NSW"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                  />
                </div>
              </div>
              <button
                onClick={handleKeywordSearch}
                disabled={keywordsLoading || !businessType.trim()}
                className="px-5 py-2.5 bg-[#D4AF37] text-black text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-40 transition"
              >
                {keywordsLoading ? 'Generating...' : 'Generate 20 Keywords →'}
              </button>
              {keywordsError && <p className="text-red-400 text-sm">{keywordsError}</p>}
            </div>

            {keywords.length > 0 && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1f1f1f] flex items-center justify-between">
                  <h3 className="text-white font-semibold">{keywords.length} Keywords found</h3>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span className="text-blue-400">● Informational</span>
                    <span className="text-yellow-400">● Commercial</span>
                    <span className="text-green-400">● Transactional</span>
                  </div>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                  {keywords.map((kw, i) => (
                    <div key={i} className="px-5 py-3 flex items-start justify-between gap-4 hover:bg-[#1a1a1a] transition group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium text-sm">{kw.keyword}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${intentColors[kw.intent]}`}>
                            {kw.intent}
                          </span>
                          <span className={`text-xs font-medium ${difficultyColors[kw.difficulty]}`}>
                            {kw.difficulty} difficulty
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs">{kw.rationale}</p>
                      </div>
                      <button
                        onClick={() => handleUseBriefKeyword(kw.keyword)}
                        className="flex-shrink-0 text-xs px-3 py-1.5 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg hover:bg-[#D4AF37]/10 transition opacity-0 group-hover:opacity-100"
                      >
                        Write brief →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Audit Tab ── */}
        {tab === 'audit' && (
          <div className="space-y-5">
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 space-y-4">
              <h2 className="text-white font-semibold">On-Page SEO Audit</h2>
              <div className="flex gap-3">
                <input
                  value={auditUrl}
                  onChange={e => setAuditUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAudit()}
                  placeholder="https://yourwebsite.com"
                  className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                />
                <button
                  onClick={handleAudit}
                  disabled={auditLoading || !auditUrl.trim()}
                  className="px-5 py-2.5 bg-[#D4AF37] text-black text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-40 transition whitespace-nowrap"
                >
                  {auditLoading ? 'Auditing...' : 'Run Audit →'}
                </button>
              </div>
              {auditError && <p className="text-red-400 text-sm">{auditError}</p>}
            </div>

            {auditResult && (
              <div className="space-y-4">
                {/* Score */}
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 flex items-center gap-6">
                  <ScoreRing score={auditResult.score} />
                  <div>
                    <p className="text-white font-semibold text-lg">SEO Score: {auditResult.score}/100</p>
                    <p className="text-gray-400 text-sm mt-1">{auditResult.summary}</p>
                    <p className="text-gray-600 text-xs mt-1">{auditResult.url}</p>
                  </div>
                </div>

                {/* Signals grid */}
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
                  <h3 className="text-white font-semibold mb-4">Signal Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Title', pass: auditResult.signals.hasTitle && auditResult.signals.titleLength >= 50 && auditResult.signals.titleLength <= 60, detail: `${auditResult.signals.titleLength} chars` },
                      { label: 'Meta Desc', pass: auditResult.signals.hasMetaDesc && auditResult.signals.metaDescLength >= 120, detail: `${auditResult.signals.metaDescLength} chars` },
                      { label: 'H1 Tag', pass: auditResult.signals.h1Count === 1, detail: `${auditResult.signals.h1Count} found` },
                      { label: 'Image Alt', pass: auditResult.signals.imagesWithAlt === auditResult.signals.imagesTotal, detail: `${auditResult.signals.imagesWithAlt}/${auditResult.signals.imagesTotal}` },
                      { label: 'Internal Links', pass: auditResult.signals.internalLinks >= 5, detail: `${auditResult.signals.internalLinks} links` },
                      { label: 'Schema', pass: auditResult.signals.hasSchema, detail: auditResult.signals.hasSchema ? 'Found' : 'Missing' },
                      { label: 'Word Count', pass: auditResult.signals.wordCount >= 300, detail: `${auditResult.signals.wordCount} words` },
                      { label: 'Load Time', pass: auditResult.signals.loadTimeSignal.startsWith('fast'), detail: auditResult.signals.loadTimeSignal },
                    ].map(sig => (
                      <div key={sig.label} className="bg-[#0a0a0a] rounded-xl p-3 border border-[#1a1a1a]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={sig.pass ? 'text-green-400' : 'text-red-400'}>
                            {sig.pass ? '✅' : '❌'}
                          </span>
                          <span className="text-xs text-gray-400">{sig.label}</span>
                        </div>
                        <p className="text-sm text-white font-medium">{sig.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top fixes */}
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
                  <h3 className="text-white font-semibold mb-4">Top 5 Fixes</h3>
                  <div className="space-y-3">
                    {auditResult.fixes.map(fix => (
                      <div key={fix.priority} className="flex gap-3 p-3 bg-[#0a0a0a] rounded-xl border border-[#1a1a1a]">
                        <span className="w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {fix.priority}
                        </span>
                        <div>
                          <p className="text-white text-sm font-medium">{fix.issue}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{fix.fix}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Content Brief Tab ── */}
        {tab === 'brief' && (
          <div className="space-y-5">
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 space-y-4">
              <h2 className="text-white font-semibold">Content Brief Generator</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="text-xs text-gray-400 mb-1 block">Target keyword *</label>
                  <input
                    value={briefKeyword}
                    onChange={e => setBriefKeyword(e.target.value)}
                    placeholder="e.g. emergency plumber Sydney"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Business type (optional)</label>
                  <input
                    value={businessType}
                    onChange={e => setBusinessType(e.target.value)}
                    placeholder="e.g. plumber"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Location (optional)</label>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Sydney, NSW"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                  />
                </div>
              </div>
              {selectedKeyword && selectedKeyword !== briefKeyword && (
                <p className="text-xs text-[#D4AF37]">💡 Selected from keywords: {selectedKeyword}</p>
              )}
              <button
                onClick={handleGenerateBrief}
                disabled={briefLoading || !briefKeyword.trim()}
                className="px-5 py-2.5 bg-[#D4AF37] text-black text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-40 transition"
              >
                {briefLoading ? 'Generating...' : 'Generate Content Brief →'}
              </button>
              {briefError && <p className="text-red-400 text-sm">{briefError}</p>}
            </div>

            {brief && (
              <div className="space-y-4">
                {/* Brief header */}
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-full">
                          🎯 {brief.keyword}
                        </span>
                        <span className="text-xs text-gray-500">~{brief.wordCountTarget} words</span>
                      </div>
                      <h3 className="text-white font-bold text-lg mb-1">{brief.title}</h3>
                      <p className="text-gray-400 text-sm">{brief.metaDescription}</p>
                    </div>
                    <button
                      onClick={copyBrief}
                      className="flex-shrink-0 px-3 py-1.5 text-xs border border-[#2a2a2a] text-gray-400 rounded-lg hover:text-white hover:border-[#D4AF37]/30 transition"
                    >
                      {briefCopied ? '✅ Copied' : '📋 Copy brief'}
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#1f1f1f] grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Target audience</p>
                      <p className="text-sm text-white">{brief.targetAudience}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Content goal</p>
                      <p className="text-sm text-white">{brief.contentGoal}</p>
                    </div>
                  </div>
                </div>

                {/* H2 structure */}
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
                  <h3 className="text-white font-semibold mb-4">Article Structure</h3>
                  <div className="space-y-3">
                    {brief.h2Structure.map((h2, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold flex items-center justify-center flex-shrink-0">
                          H2
                        </span>
                        <div>
                          <p className="text-white font-medium text-sm">{h2.heading}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{h2.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Semantic keywords + CTA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
                    <h3 className="text-white font-semibold mb-3">Semantic Keywords to Include</h3>
                    <div className="flex flex-wrap gap-2">
                      {brief.semanticKeywords.map(kw => (
                        <span key={kw} className="text-xs px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
                    <h3 className="text-white font-semibold mb-3">Call to Action</h3>
                    <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl px-4 py-3">
                      <p className="text-[#D4AF37] font-bold text-sm">&ldquo;{brief.cta}&rdquo;</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
