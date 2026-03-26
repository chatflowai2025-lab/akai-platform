'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

// ── How it works step card ───────────────────────────────────────────────────
function HowItWorksStep({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
        <span className="text-xs font-black text-[#D4AF37]">{step}</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <p className="font-bold text-white text-sm">{title}</p>
        </div>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function EmailGuardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [guardStatus, setGuardStatus] = useState<'loading' | 'live' | 'inactive'>('loading');
  const [guardVersion, setGuardVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Fetch Email Guard health from backend
    fetch('/api/mail-guard/health', {
      headers: { 'x-api-key': 'aiclozr_api_key_2026_prod' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.status === 'ok') {
          setGuardStatus('live');
          setGuardVersion(data.version ?? null);
        } else {
          setGuardStatus('inactive');
        }
      })
      .catch(() => setGuardStatus('inactive'));
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-600 hover:text-white transition text-sm">
              ← Dashboard
            </Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              🛡️ Email Guard
            </h1>
          </div>
          <Link
            href="/settings"
            className="text-xs text-gray-600 hover:text-white transition px-3 py-1.5 rounded-lg border border-[#1f1f1f] hover:border-[#2f2f2f]"
          >
            ⚙️ Configure
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-4xl">

          {/* Status card */}
          <section>
            <div
              className={`rounded-2xl p-6 border flex items-center justify-between ${
                guardStatus === 'live'
                  ? 'bg-green-500/5 border-green-500/20'
                  : guardStatus === 'inactive'
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-[#111] border-[#1f1f1f]'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">🛡️</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-white text-lg">Email Guard</p>
                    {guardStatus === 'loading' && (
                      <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                    )}
                    {guardStatus === 'live' && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                        Active
                      </span>
                    )}
                    {guardStatus === 'inactive' && (
                      <span className="text-xs font-semibold text-red-400 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {guardStatus === 'live'
                      ? `Monitoring inbox for enquiries — auto-generating proposals${guardVersion ? ` · v${guardVersion}` : ''}`
                      : guardStatus === 'inactive'
                      ? 'Service unavailable — check configuration'
                      : 'Checking service status…'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Recent enquiries */}
          <section>
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
              Recent enquiries processed
            </h2>
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-2xl">
                📭
              </div>
              <div>
                <p className="text-white/70 font-semibold text-sm">No enquiries yet</p>
                <p className="text-gray-600 text-xs mt-1 max-w-xs">
                  Once you connect your inbox and enquiries arrive, they'll appear here with
                  their auto-generated proposals.
                </p>
              </div>
              <Link
                href="/settings"
                className="mt-2 flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition"
              >
                🔗 Connect your inbox
              </Link>
            </div>
          </section>

          {/* Connect CTA */}
          <section>
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
              Connect your inbox
            </h2>
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 space-y-4">
              <p className="text-sm text-gray-400">
                Point your inbound email to the Email Guard webhook and let AI handle the rest.
                Enquiries are parsed, classified, and a tailored proposal is generated automatically.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition"
                >
                  ⚙️ Configure Email Guard
                </Link>
                <a
                  href="https://docs.aiclozr.com/email-guard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-[#2f2f2f] text-white rounded-xl text-sm font-medium hover:border-[#D4AF37]/30 transition"
                >
                  📖 View docs
                </a>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section>
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
              How it works
            </h2>
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 space-y-6">
              <HowItWorksStep
                step={1}
                icon="📬"
                title="Connect inbox"
                description="Forward your enquiry email address to the Email Guard webhook, or configure your MX/SMTP settings to pipe inbound mail directly."
              />
              <div className="w-full border-t border-[#1f1f1f]" />
              <HowItWorksStep
                step={2}
                icon="🤖"
                title="AI reads enquiries"
                description="Every inbound email is parsed and classified. The AI extracts the client's name, budget, timeline, and requirements — no manual work needed."
              />
              <div className="w-full border-t border-[#1f1f1f]" />
              <HowItWorksStep
                step={3}
                icon="📄"
                title="Proposals sent to you"
                description="A tailored proposal is generated within seconds and delivered to your dashboard. Review, personalise if needed, and send — or let Email Guard auto-send it."
              />
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
