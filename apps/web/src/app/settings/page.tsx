'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 space-y-4">
      <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{title}</h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, userProfile } = useAuth();
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [forwardCopied, setForwardCopied] = useState(false);

  const webhookUrl = 'https://api-server-production-2a27.up.railway.app/api/mail-guard/inbound';
  const forwardAddress = 'inbound@aiclozr.com';

  const copy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
        <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
          <div>
            <h1 className="text-xl font-black text-white">Settings</h1>
            <p className="text-xs text-gray-500 mt-0.5">Account and workspace configuration</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-3xl">

          {/* Account */}
          <Section title="Account">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-black text-lg">
                {(userProfile?.displayName || user?.email || 'A')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{userProfile?.displayName || userProfile?.businessName || 'Your Account'}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          </Section>

          {/* Email Guard Connect */}
          <Section title="Email Guard — Connect your inbox">
            <p className="text-sm text-gray-400 leading-relaxed">
              Point your enquiry inbox at AKAI. Every inbound email is parsed, classified, and a tailored proposal is generated automatically and sent to your dashboard.
            </p>

            <div className="space-y-4">
              {/* Option 1: Forward email */}
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Option A — Email Forwarding</span>
                  <span className="text-xs px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full">Recommended</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Set up an auto-forward rule in your email client to this address:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#D4AF37] font-mono">{forwardAddress}</code>
                  <button
                    onClick={() => copy(forwardAddress, setForwardCopied)}
                    className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg text-xs font-medium hover:border-[#D4AF37]/30 transition flex-shrink-0"
                  >
                    {forwardCopied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">In Gmail: Settings → Forwarding → Add forwarding address → paste above</p>
              </div>

              {/* Option 2: Webhook */}
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Option B — Webhook</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">If your email provider supports webhooks (SendGrid, Postmark, Mailgun), point inbound events here:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white/70 font-mono truncate">{webhookUrl}</code>
                  <button
                    onClick={() => copy(webhookUrl, setWebhookCopied)}
                    className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg text-xs font-medium hover:border-[#D4AF37]/30 transition flex-shrink-0"
                  >
                    {webhookCopied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <a
                href="/email-guard"
                className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition"
              >
                ✉️ View Email Guard →
              </a>
            </div>
          </Section>

          {/* Sophie AI */}
          <Section title="Sophie AI — Sales Agent">
            <p className="text-sm text-gray-400 leading-relaxed">
              Sophie is your AI sales agent. She makes outbound calls, qualifies leads, and books meetings — 24/7.
            </p>
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Voice: Sophie (Australian English)</p>
                  <p className="text-xs text-gray-500 mt-0.5">Bland.ai · BTTS voice configured</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-green-400 font-semibold">Live</span>
                </div>
              </div>
            </div>
            <a
              href="/sales"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl text-sm font-medium hover:border-[#D4AF37]/30 transition"
            >
              📞 Go to Sales →
            </a>
          </Section>

        </div>
    </DashboardLayout>
  );
}
