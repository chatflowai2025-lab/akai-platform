'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

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

export default function HealthPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [fetching, setFetching] = useState(false);
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const runHealthCheck = async () => {
    if (!website || fetching) return;
    setFetching(true);
    setError('');
    try {
      const res = await fetch('/api/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website, email: user?.email, name: user?.displayName }),
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

  if (loading || !user) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">🏥 Business Health Check</h1>
          <p className="text-white/40 text-sm">Audit your website and digital presence. Get a prioritised action plan.</p>
        </div>

        {/* Input */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 mb-6">
          <label className="block text-xs text-white/50 mb-2 font-medium">Your website URL</label>
          <div className="flex gap-3">
            <input
              type="url"
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
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        {/* Loading */}
        {fetching && (
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-12 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            <p className="text-white/50 text-sm">Analysing your digital presence...</p>
          </div>
        )}

        {/* Report */}
        {report && !fetching && (
          <div className="space-y-4">
            {/* Score card */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs mb-1">Overall Health Score</p>
                <p className={`text-5xl font-black ${scoreColor(report.score)}`}>{report.score}<span className="text-2xl text-white/30">/100</span></p>
                <p suppressHydrationWarning className="text-white/40 text-xs mt-2">{report.website} · {new Date(report.generatedAt).toLocaleDateString()}</p>
              </div>
              <div className="text-6xl">
                {report.score >= 80 ? '✅' : report.score >= 60 ? '⚠️' : '🚨'}
              </div>
            </div>

            {/* Sections */}
            {report.sections?.map((section, i) => (
              <div key={i} className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">{section.title}</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${statusColor(section.status)}`}>
                    {section.score}/100
                  </span>
                </div>
                {section.findings?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-white/30 mb-2 uppercase tracking-wide">Findings</p>
                    <ul className="space-y-1">
                      {section.findings.map((f, j) => <li key={j} className="text-sm text-white/60 flex gap-2"><span>•</span>{f}</li>)}
                    </ul>
                  </div>
                )}
                {section.recommendations?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/30 mb-2 uppercase tracking-wide">Recommendations</p>
                    <ul className="space-y-1">
                      {section.recommendations.map((r, j) => <li key={j} className="text-sm text-[#D4AF37]/80 flex gap-2"><span>→</span>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {/* Talk to AKAI CTA */}
            <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-6 text-center">
              <p className="text-white font-semibold mb-1">Want AKAI to fix these for you?</p>
              <p className="text-white/40 text-sm mb-4">Our team can action every recommendation — automatically.</p>
              <button
                onClick={() => router.push('/sales')}
                className="bg-[#D4AF37] hover:bg-[#F59E0B] text-black font-bold px-6 py-3 rounded-xl transition text-sm"
              >
                Let AKAI handle it →
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!report && !fetching && (
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-12 text-center">
            <p className="text-4xl mb-4">🏥</p>
            <p className="text-white font-semibold mb-2">No report yet</p>
            <p className="text-white/40 text-sm">Enter your website URL above and run your first health check.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
