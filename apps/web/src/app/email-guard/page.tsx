'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout, { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

const RAILWAY = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

interface Enquiry {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  status: 'proposal_draft' | 'sent' | 'held';
  proposal?: { body: string; generatedAt: string };
  matchedRule?: string;
}

// ── Help button — rendered inside DashboardLayout so context is available ──
function ConnectHelp() {
  const { sendMessage } = useDashboardChat();
  return (
    <button
      onClick={() => sendMessage('How do I connect my inbox?')}
      className="text-xs text-gray-600 hover:text-white transition px-3 py-1.5 rounded-lg border border-[#1f1f1f] hover:border-[#2f2f2f]"
    >
      ⚙️ Help
    </button>
  );
}

// ── Inner content — rendered inside DashboardLayout ───────────────────────
// useDashboardChat() works here because this component is a child of DashboardLayout.

interface EmailGuardContentProps {
  user: { uid: string };
  initialCode: string | null;
  initialState: string | null;
  initialConnectedParam: string | null;
  initialEmailParam: string | null;
  initialErrorParam: string | null;
}

function EmailGuardContent({
  user,
  initialCode,
  initialState,
  initialConnectedParam,
  initialEmailParam,
  initialErrorParam,
}: EmailGuardContentProps) {
  const router = useRouter();
  const { sendMessage } = useDashboardChat();

  const [msConnected, setMsConnected] = useState(false);
  const [msEmail, setMsEmail] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [polling, setPolling] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  // Handle OAuth return params (passed in from the Suspense boundary below)
  useEffect(() => {
    if (initialConnectedParam === 'gmail' && initialEmailParam) {
      setGmailConnected(true);
      setGmailEmail(decodeURIComponent(initialEmailParam));
      router.replace('/email-guard');
      sendMessage('My inbox is now connected — what can you do with it?');
      return;
    }
    if (initialErrorParam) {
      setConnectError('Connection failed — please try again.');
      router.replace('/email-guard');
      return;
    }
    // MS OAuth callback — exchange code for token
    if (initialCode) {
      setConnecting(true);
      fetch(`${RAILWAY}/api/email/microsoft/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({
          code: initialCode,
          state: initialState,
          userId: user.uid,
          redirectUri: 'https://getakai.ai/email-guard',
        }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.success || d.email) {
            setMsConnected(true);
            setMsEmail(d.email || null);
            router.replace('/email-guard');
            sendMessage('My inbox is now connected — what can you do with it?');
          } else {
            setConnectError(d.error || 'Connection failed.');
          }
        })
        .catch(() => setConnectError('Connection failed.'))
        .finally(() => setConnecting(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check connection status + load enquiries on mount
  useEffect(() => {
    fetch(`${RAILWAY}/api/email/microsoft/status?userId=${user.uid}`, { headers: { 'x-api-key': API_KEY } })
      .then(r => r.json())
      .then(d => { if (d.connected) { setMsConnected(true); setMsEmail(d.email || null); } })
      .catch(() => {});

    fetch(`${RAILWAY}/api/email/gmail/status?userId=${user.uid}`, { headers: { 'x-api-key': API_KEY } })
      .then(r => r.json())
      .then(d => { if (d.connected) { setGmailConnected(true); setGmailEmail(d.email || null); } })
      .catch(() => {});

    fetch(`${RAILWAY}/api/email/enquiries/${user.uid}`, { headers: { 'x-api-key': API_KEY } })
      .then(r => r.json())
      .then(d => setEnquiries(d.enquiries || []))
      .catch(() => {});
  }, [user.uid]);

  const connectMicrosoft = async () => {
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
        setConnectError('Could not generate login URL.');
        setConnecting(false);
      }
    } catch {
      setConnectError('Connection failed.');
      setConnecting(false);
    }
  };

  const connectGoogle = async () => {
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
        setConnectError('Could not generate login URL.');
        setConnecting(false);
      }
    } catch {
      setConnectError('Connection failed.');
      setConnecting(false);
    }
  };

  const disconnect = useCallback(async (provider: 'microsoft' | 'gmail') => {
    await fetch(`${RAILWAY}/api/email/${provider}/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ userId: user.uid }),
    });
    if (provider === 'microsoft') { setMsConnected(false); setMsEmail(null); }
    else { setGmailConnected(false); setGmailEmail(null); }
  }, [user.uid]);

  const pollNow = async () => {
    setPolling(true);
    try {
      await fetch(`${RAILWAY}/api/email/poll/${user.uid}`, {
        method: 'POST',
        headers: { 'x-api-key': API_KEY },
      });
      const d = await fetch(`${RAILWAY}/api/email/enquiries/${user.uid}`, {
        headers: { 'x-api-key': API_KEY },
      }).then(r => r.json());
      setEnquiries(d.enquiries || []);
    } catch {
      // polling error — silent, user sees no new enquiries
    } finally {
      setPolling(false);
    }
  };

  const sendProposal = async (eq: Enquiry) => {
    setSending(eq.id);
    try {
      await fetch(`${RAILWAY}/api/email/${user.uid}/${eq.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({
          proposalBody: eq.proposal?.body,
          subject: `Re: ${eq.subject}`,
        }),
      });
      setEnquiries(prev => prev.map(e => e.id === eq.id ? { ...e, status: 'sent' as const } : e));
    } catch {
      // send error — leave status as-is, user can retry
    } finally {
      setSending(null);
    }
  };

  const isConnected = msConnected || gmailConnected;
  const connectedEmail = msEmail || gmailEmail;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
        <div>
          <h1 className="text-xl font-black text-white">✉️ Email Guard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Reads enquiries, generates proposals automatically</p>
        </div>
        {/* ConnectHelp uses useDashboardChat() — works here because we're inside DashboardLayout */}
        <ConnectHelp />
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-3xl">

        {/* ── Connected state ─────────────────────────────────────────── */}
        {/* ── Always show both providers ──────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-white">Connected inboxes</h2>
            <p className="text-xs text-gray-600">Connect one or both — AKAI monitors all of them</p>
          </div>

          {connectError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {connectError}
            </p>
          )}

          {/* Microsoft */}
          <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${msConnected ? 'bg-[#0078d4]/5 border-[#0078d4]/30' : 'bg-[#111] border-[#1f1f1f]'}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0078d4]/10 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Microsoft / Outlook</p>
                {msConnected && msEmail
                  ? <p className="text-xs text-green-400">{msEmail} · Live</p>
                  : <p className="text-xs text-gray-500">Not connected</p>}
              </div>
            </div>
            {msConnected
              ? <button onClick={() => disconnect('microsoft')} className="text-xs text-gray-600 hover:text-red-400 transition px-3 py-1.5 rounded-lg border border-[#1f1f1f] hover:border-red-500/30">Disconnect</button>
              : <button onClick={connectMicrosoft} disabled={connecting} className="text-xs px-4 py-2 bg-[#0078d4] text-white rounded-lg font-semibold hover:bg-[#006cbd] transition disabled:opacity-40">Connect →</button>
            }
          </div>

          {/* Gmail */}
          <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${gmailConnected ? 'bg-green-500/5 border-green-500/20' : 'bg-[#111] border-[#1f1f1f]'}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Gmail / Google Workspace</p>
                {gmailConnected && gmailEmail
                  ? <p className="text-xs text-green-400">{gmailEmail} · Live</p>
                  : <p className="text-xs text-gray-500">Not connected</p>}
              </div>
            </div>
            {gmailConnected
              ? <button onClick={() => disconnect('gmail')} className="text-xs text-gray-600 hover:text-red-400 transition px-3 py-1.5 rounded-lg border border-[#1f1f1f] hover:border-red-500/30">Disconnect</button>
              : <button onClick={connectGoogle} disabled={connecting} className="text-xs px-4 py-2 bg-white text-[#1a1a1a] rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-40">Connect →</button>
            }
          </div>

          {connecting && (
            <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
              <div className="w-3 h-3 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              Connecting…
            </div>
          )}
          <p className="text-xs text-gray-600 px-1">AKAI only reads emails to generate proposals. Disconnect anytime.</p>
        </div>

        {/* ── Pre-connect preview (shown only when not connected, not connecting) ── */}
        {!isConnected && !connecting && (
          <section>
            <div className="mb-4">
              <h2 className="text-base font-black text-white">This is what lands in your dashboard</h2>
              <p className="text-xs text-gray-500 mt-1">
                Connect your inbox and enquiries like this arrive automatically — with proposals already drafted.
              </p>
            </div>

            {/* Mock enquiry card */}
            <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden opacity-90 select-none">
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#D4AF37]" />
                    <p className="text-sm font-semibold text-white truncate">Kitchen renovation enquiry</p>
                  </div>
                  <p className="text-xs text-gray-400">john.smith@gmail.com</p>
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    Hi, I&apos;m interested in a custom kitchen for my Mosman home, budget around $40k…
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 font-semibold whitespace-nowrap">
                  ✨ Proposal ready
                </span>
              </div>

              <div className="border-t border-[#1f1f1f] p-4 space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">AI-generated proposal</p>
                <div className="bg-[#0a0a0a] rounded-xl p-4 space-y-2 relative overflow-hidden">
                  <p className="text-sm text-white/40 leading-relaxed">Hi John,</p>
                  <p className="text-sm text-white/30 leading-relaxed">
                    Thank you for reaching out about your kitchen renovation in Mosman. Based on your budget of $40,000,
                    we&apos;d love to create something exceptional for you…
                  </p>
                  <p className="text-sm text-white/20 leading-relaxed">
                    Our custom cabinetry starts from premium European materials, and we&apos;ll include a full design
                    consultation at no charge. We&apos;ve completed over 40 kitchens in the…
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
                </div>
                <div className="relative group inline-block">
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37]/20 text-[#D4AF37]/40 rounded-xl text-sm font-bold cursor-not-allowed border border-[#D4AF37]/10"
                  >
                    ✉️ Send this proposal
                  </button>
                  <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#2f2f2f] text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                    Connect inbox to enable
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-600 text-center mt-4">
              ⬆️ Connect your inbox above to start receiving real enquiries like this
            </p>
          </section>
        )}

        {/* ── Enquiries list (shown when connected) ────────────────────── */}
        {isConnected && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Recent enquiries</h2>
              <button
                onClick={pollNow}
                disabled={polling}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#1f1f1f] text-gray-500 hover:text-white hover:border-[#D4AF37]/30 transition disabled:opacity-40"
              >
                {polling ? '⏳ Checking...' : '🔄 Check now'}
              </button>
            </div>

            {enquiries.length > 0 ? (
              <div className="space-y-3">
                {enquiries.map(eq => (
                  <div key={eq.id} className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                    <div
                      className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-[#141414] transition"
                      onClick={() => setSelectedId(selectedId === eq.id ? null : eq.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${eq.status === 'sent' ? 'bg-green-400' : 'bg-[#D4AF37] animate-pulse'}`} />
                          <p className="text-sm font-semibold text-white truncate">{eq.subject || '(No subject)'}</p>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{eq.from}</p>
                        <p className="text-xs text-gray-600 mt-1 truncate">{eq.body?.slice(0, 80)}…</p>
                      </div>
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${eq.status === 'sent' ? 'bg-green-500/10 text-green-400' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
                        {eq.status === 'sent' ? '✓ Sent' : 'Proposal ready'}
                      </span>
                    </div>
                    {selectedId === eq.id && eq.proposal && (
                      <div className="border-t border-[#1f1f1f] p-4 space-y-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">AI-generated proposal</p>
                        <div className="bg-[#0a0a0a] rounded-xl p-4 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                          {eq.proposal.body}
                        </div>
                        {eq.status !== 'sent' && (
                          <button
                            onClick={() => sendProposal(eq)}
                            disabled={sending === eq.id}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
                          >
                            {sending === eq.id ? '⏳ Sending...' : '✉️ Send this proposal'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-2xl">📭</div>
                <div>
                  <p className="text-white/70 font-semibold text-sm">No enquiries yet</p>
                  <p className="text-gray-600 text-xs mt-1 max-w-xs">
                    Hit &quot;Check now&quot; to poll your inbox, or wait — AKAI checks every 5 minutes automatically.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}

// ── OAuth param reader — needs Suspense boundary for useSearchParams ──────

function EmailGuardWithParams({ user }: { user: { uid: string } }) {
  const searchParams = useSearchParams();

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const connected = searchParams.get('connected');
  const email = searchParams.get('email');
  const error = searchParams.get('error');

  return (
    <EmailGuardContent
      user={user}
      initialCode={code}
      initialState={state}
      initialConnectedParam={connected}
      initialEmailParam={email}
      initialErrorParam={error}
    />
  );
}

// ── Auth gate — renders DashboardLayout wrapping the content ──────────────
// EmailGuardContent uses useDashboardChat() which requires being inside
// DashboardLayout's ChatContext.Provider. We render content as children of
// DashboardLayout so the context is available.

function EmailGuardPage() {
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
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <EmailGuardWithParams user={user} />
      </Suspense>
    </DashboardLayout>
  );
}

export default EmailGuardPage;
