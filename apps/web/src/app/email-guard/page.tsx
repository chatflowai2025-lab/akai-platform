'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout, { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

const RAILWAY = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

function ConnectInboxButton({ label = '🔗 Connect your inbox', small = false }: { label?: string; small?: boolean }) {
  const { sendMessage } = useDashboardChat();
  return (
    <button
      onClick={() => sendMessage('I want to connect my inbox to Email Guard')}
      className={small
        ? 'text-xs text-gray-600 hover:text-white transition px-3 py-1.5 rounded-lg border border-[#1f1f1f] hover:border-[#2f2f2f]'
        : 'flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition'
      }
    >
      {label}
    </button>
  );
}

function HowItWorksStep({ step, icon, title, description }: { step: number; icon: string; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
        <span className="text-xs font-black text-[#D4AF37]">{step}</span>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{icon}</span>
          <p className="font-bold text-white text-sm">{title}</p>
        </div>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function EmailGuardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [guardStatus, setGuardStatus] = useState<'loading' | 'live' | 'inactive'>('loading');
  const [guardVersion, setGuardVersion] = useState<string | null>(null);
  const [msConnected, setMsConnected] = useState(false);
  const [msEmail, setMsEmail] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Handle OAuth callback — code in URL params
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const provider = searchParams.get('provider') || (state?.includes('gmail') ? 'gmail' : 'microsoft');
    if (!code || !user) return;

    setConnecting(true);
    fetch(`${RAILWAY}/api/email/microsoft/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ code, state, userId: user.uid, redirectUri: 'https://getakai.ai/email-guard' }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success || d.email) {
          setMsConnected(true);
          setMsEmail(d.email || null);
          router.replace('/email-guard'); // remove code from URL
        } else {
          setConnectError(d.error || 'Connection failed — please try again.');
        }
      })
      .catch(() => setConnectError('Connection failed — please try again.'))
      .finally(() => setConnecting(false));
  }, [searchParams, user, router]);

  // Check connection status
  useEffect(() => {
    if (!user) return;
    fetch(`${RAILWAY}/api/email/microsoft/status?userId=${user.uid}`, { headers: { 'x-api-key': API_KEY } })
      .then(r => r.json()).then(d => { if (d.connected) { setMsConnected(true); setMsEmail(d.email || null); } }).catch(() => {});
    fetch(`${RAILWAY}/api/email/gmail/status?userId=${user.uid}`, { headers: { 'x-api-key': API_KEY } })
      .then(r => r.json()).then(d => { if (d.connected) { setGmailConnected(true); setGmailEmail(d.email || null); } }).catch(() => {});
  }, [user]);

  // Health check
  useEffect(() => {
    fetch(`${RAILWAY}/api/mail-guard/health`, { headers: { 'x-api-key': API_KEY } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.status === 'ok') { setGuardStatus('live'); setGuardVersion(d.version ?? null); }
        else setGuardStatus('inactive');
      })
      .catch(() => setGuardStatus('inactive'));
  }, []);

  const connectGoogle = async () => {
    if (!user) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch(`${RAILWAY}/api/email/gmail/auth-url?userId=${user.uid}`, {
        headers: { 'x-api-key': API_KEY },
      });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setConnectError('Could not generate login URL — please try again.');
        setConnecting(false);
      }
    } catch {
      setConnectError('Connection failed — please try again.');
      setConnecting(false);
    }
  };

  const connectMicrosoft = async () => {
    if (!user) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch(`${RAILWAY}/api/email/microsoft/auth-url?userId=${user.uid}`, {
        headers: { 'x-api-key': API_KEY },
      });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setConnectError('Could not generate login URL — please try again.');
        setConnecting(false);
      }
    } catch {
      setConnectError('Connection failed — please try again.');
      setConnecting(false);
    }
  };

  const disconnectMicrosoft = async () => {
    if (!user) return;
    await fetch(`${RAILWAY}/api/email/microsoft/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ userId: user.uid }),
    });
    setMsConnected(false);
    setMsEmail(null);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">✉️ Email Guard</h1>
            <p className="text-xs text-gray-500 mt-0.5">Inbox monitoring &amp; auto-proposal generation</p>
          </div>
          <div className="flex items-center gap-2">
  
            <ConnectInboxButton label="⚙️ Help" small />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-3xl">

          {/* Connect your inbox — ONE BIG BUTTON */}
          {connecting ? (
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              <p className="text-white/70 text-sm">Connecting your inbox…</p>
            </div>
          ) : msConnected ? (
            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#0078d4]/20 border border-[#0078d4]/30 flex items-center justify-center text-2xl">📧</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-white">Inbox connected</p>
                    <span className="flex items-center gap-1 text-xs text-green-400 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Live
                    </span>
                  </div>
                  {msEmail && <p className="text-sm text-gray-400 mt-0.5">{msEmail}</p>}
                  {gmailEmail && <p className="text-sm text-gray-400 mt-0.5">{gmailEmail}</p>}
                  <p className="text-xs text-gray-600 mt-1">AKAI will read enquiries and generate proposals automatically.</p>
                </div>
              </div>
              <button onClick={disconnectMicrosoft}
                className="text-xs text-gray-600 hover:text-red-400 transition px-3 py-1.5 rounded-lg border border-[#1f1f1f] hover:border-red-500/30">
                Disconnect
              </button>
            </div>
          ) : (
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-[#0078d4]/10 border border-[#0078d4]/20 flex items-center justify-center text-3xl">📧</div>
              <div>
                <h2 className="text-xl font-black text-white mb-2">Connect your inbox</h2>
                <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
                  One click. AKAI reads your enquiries and generates tailored proposals automatically — no forwarding rules, no admin, no IT.
                </p>
              </div>

              {connectError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 w-full">{connectError}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <button
                  onClick={connectMicrosoft}
                  disabled={connecting}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-[#0078d4] text-white rounded-xl text-sm font-bold hover:bg-[#006cbd] transition disabled:opacity-50 shadow-lg shadow-[#0078d4]/20"
                >
                  <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                  </svg>
                  Microsoft / Outlook
                </button>
                <button
                  onClick={connectGoogle}
                  disabled={connecting}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white text-[#1a1a1a] rounded-xl text-sm font-bold hover:bg-gray-100 transition disabled:opacity-50"
                >
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Gmail
                </button>
              </div>

              <p className="text-xs text-gray-600 max-w-xs">
                AKAI will only read emails to generate proposals. Your data stays private and you can disconnect anytime.
              </p>
            </div>
          )}

          {/* Recent enquiries */}
          <section>
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Recent enquiries</h2>
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-2xl">📭</div>
              <div>
                <p className="text-white/70 font-semibold text-sm">No enquiries yet</p>
                <p className="text-gray-600 text-xs mt-1 max-w-xs">
                  {msConnected ? 'Waiting for your first enquiry — it will appear here automatically.' : 'Connect your inbox above to start receiving enquiries.'}
                </p>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section>
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">How it works</h2>
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 space-y-6">
              <HowItWorksStep step={1} icon="🔗" title="Connect your inbox" description="One-click Microsoft sign-in. No forwarding rules, no IT admin, no technical setup." />
              <div className="w-full border-t border-[#1f1f1f]" />
              <HowItWorksStep step={2} icon="🤖" title="AKAI reads enquiries" description="Every inbound email is read and classified. Name, budget, timeline, requirements — all extracted automatically." />
              <div className="w-full border-t border-[#1f1f1f]" />
              <HowItWorksStep step={3} icon="📄" title="Proposal sent to dashboard" description="A tailored proposal lands here within seconds. Review, personalise, and send — or let AKAI auto-send it." />
            </div>
          </section>

        </div>
      </div>
    </DashboardLayout>
  );
}

export default function EmailGuardPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <EmailGuardInner />
    </Suspense>
  );
}
