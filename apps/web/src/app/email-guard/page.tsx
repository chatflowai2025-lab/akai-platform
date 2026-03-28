'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout, { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { isSafeMode } from '@/lib/beta-config';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ── Safe sendMessage wrapper — prevents crash if chat context not ready ────
function safeSend(sendMessage: (t: string) => void, text: string) {
  try { sendMessage(text); } catch { /* chat not ready */ }
}

const RAILWAY = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

interface Enquiry {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  status: 'proposal_draft' | 'sent' | 'held';
  proposal?: { body: string; htmlBody?: string; vertical?: string; generatedAt: string };
  matchedRule?: string;
  abTestId?: string;
  abVariantA?: string;
  abVariantB?: string;
  abVariantASubject?: string;
  abVariantBSubject?: string;
  abStatus?: string;
  leadScore?: number;
  leadTier?: 'cold' | 'warm' | 'hot' | 'fire';
  leadSignals?: string[];
}

interface EmailRule {
  id?: string;
  triggerType: 'keyword' | 'all';
  keyword?: string;
  action: 'draft' | 'auto-send' | 'hold';
  notification: 'discord' | 'sms' | 'none';
  isDefault?: boolean;
}

// ── Rules Engine UI ───────────────────────────────────────────────────────

function RulesEngine({ userId }: { userId: string }) {
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState<Omit<EmailRule, 'id'>>({
    triggerType: 'all',
    keyword: '',
    action: 'draft',
    notification: 'discord',
  });

  const DEFAULT_RULE: EmailRule = {
    id: 'default',
    triggerType: 'all',
    action: 'draft',
    notification: 'discord',
    isDefault: true,
  };

  useEffect(() => {
    fetch(`${RAILWAY}/api/email/rules/${userId}`, { headers: { 'x-api-key': API_KEY } })
      .then(r => r.json())
      .then(d => setRules(d.rules || []))
      .catch(() => setRules([]))
      .finally(() => setLoadingRules(false));
  }, [userId]);

  const saveRule = async () => {
    if (newRule.triggerType === 'keyword' && !newRule.keyword?.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${RAILWAY}/api/email/rules/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify(newRule),
      });
      const d = await res.json();
      const saved: EmailRule = d.rule || { ...newRule, id: Date.now().toString() };
      setRules(prev => [...prev, saved]);
      setNewRule({ triggerType: 'all', keyword: '', action: 'draft', notification: 'discord' });
      setShowAddForm(false);
    } catch {
      // silently add locally
      setRules(prev => [...prev, { ...newRule, id: Date.now().toString() }]);
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    fetch(`${RAILWAY}/api/email/rules/${userId}/${id}`, {
      method: 'DELETE', headers: { 'x-api-key': API_KEY },
    }).catch(() => {});
  };

  const actionLabel = (a: string) => ({ draft: 'Draft proposal', 'auto-send': 'Auto-send', hold: 'Hold' })[a] || a;
  const notifLabel = (n: string) => ({ discord: 'Notify Discord', sms: 'Notify SMS', none: 'No notification' })[n] || n;
  const triggerLabel = (r: EmailRule) => r.triggerType === 'all' ? 'All enquiries' : `Keyword: "${r.keyword}"`;

  const allRules = [DEFAULT_RULE, ...rules];

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Rules Engine</h2>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="text-xs px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-lg font-semibold hover:bg-[#D4AF37]/20 transition"
        >
          + Add rule
        </button>
      </div>

      {/* Add rule form */}
      {showAddForm && (
        <div className="bg-[#111] border border-[#D4AF37]/20 rounded-xl p-4 mb-4 space-y-3">
          <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider">New Rule</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Trigger</label>
              <select
                value={newRule.triggerType}
                onChange={e => setNewRule(r => ({ ...r, triggerType: e.target.value as 'keyword' | 'all' }))}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] transition"
              >
                <option value="all">All enquiries</option>
                <option value="keyword">Keyword match</option>
              </select>
            </div>
            {newRule.triggerType === 'keyword' && (
              <div>
                <label className="text-xs text-gray-600 block mb-1">Keyword</label>
                <input
                  type="text"
                  value={newRule.keyword}
                  onChange={e => setNewRule(r => ({ ...r, keyword: e.target.value }))}
                  placeholder="e.g. quote, urgent"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-600 block mb-1">Action</label>
              <select
                value={newRule.action}
                onChange={e => setNewRule(r => ({ ...r, action: e.target.value as 'draft' | 'auto-send' | 'hold' }))}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] transition"
              >
                <option value="draft">Draft proposal</option>
                <option value="auto-send">Auto-send</option>
                <option value="hold">Hold</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Notification</label>
              <select
                value={newRule.notification}
                onChange={e => setNewRule(r => ({ ...r, notification: e.target.value as 'discord' | 'sms' | 'none' }))}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] transition"
              >
                <option value="discord">Notify Discord</option>
                <option value="sms">Notify SMS</option>
                <option value="none">No notification</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveRule}
              disabled={saving || (newRule.triggerType === 'keyword' && !newRule.keyword?.trim())}
              className="px-4 py-2 bg-[#D4AF37] text-black rounded-lg text-xs font-bold hover:opacity-90 transition disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save Rule'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-[#2a2a2a] text-gray-400 rounded-lg text-xs hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
        {loadingRules ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {allRules.map((rule, i) => (
              <div key={rule.id ?? i} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rule.isDefault ? 'bg-[#D4AF37]' : 'bg-blue-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {triggerLabel(rule)}
                    <span className="text-gray-500 mx-1.5">→</span>
                    {actionLabel(rule.action)}
                    <span className="text-gray-500 mx-1.5">→</span>
                    <span className="text-gray-400">{notifLabel(rule.notification)}</span>
                  </p>
                  {rule.isDefault && <p className="text-[11px] text-gray-600 mt-0.5">Default rule — always active</p>}
                </div>
                {!rule.isDefault && rule.id && (
                  <button
                    onClick={() => deleteRule(rule.id!)}
                    className="text-gray-600 hover:text-red-400 transition text-sm flex-shrink-0"
                    title="Delete rule"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Help button — rendered inside DashboardLayout so context is available ──
function ConnectHelp() {
  const { sendMessage } = useDashboardChat();
  return (
    <button
      onClick={() => safeSend(sendMessage, 'How do I connect my inbox?')}
      className="text-xs text-gray-600 hover:text-white transition px-3 py-1.5 rounded-lg border border-[#1f1f1f] hover:border-[#2f2f2f]"
    >
      ⚙️ Help
    </button>
  );
}

// ── Inner content — rendered inside DashboardLayout ───────────────────────
// useDashboardChat() works here because this component is a child of DashboardLayout.

interface EmailGuardContentProps {
  user: { uid: string; email?: string | null };
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
  const chatCtx = useDashboardChat();
  const sendMessage = chatCtx?.sendMessage ?? (() => {});

  const [msConnected, setMsConnected] = useState(false);
  const [msEmail, setMsEmail] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailHasSendScope, setGmailHasSendScope] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [ctaAction, setCtaAction] = useState<string>('book_time');
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [polling, setPolling] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [firstPollBanner, setFirstPollBanner] = useState<'checking' | 'done' | null>(null);
  const [firstPollCount, setFirstPollCount] = useState<number | null>(null);
  // Send-permission modal state
  const [sendPermModal, setSendPermModal] = useState<{ enquiry: Enquiry } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Preview/Edit mode per enquiry
  const [previewMode, setPreviewMode] = useState<Record<string, 'preview' | 'edit'>>({});
  // Edited proposal text per enquiry
  const [editedBody, setEditedBody] = useState<Record<string, string>>({});
  const [abVariantTab, setAbVariantTab] = useState<Record<string, 'A' | 'B'>>({});

  // Template performance panel
  interface VerticalPerf { vertical: string; sentCount: number; replyRate: number; lastUpdated: string; }
  const [perfData, setPerfData] = useState<VerticalPerf[]>([]);
  const [perfOpen, setPerfOpen] = useState(false);

  // Auto-poll on first connect — gives instant gratification
  const triggerFirstPoll = useCallback(async () => {
    setFirstPollBanner('checking');
    try {
      await fetch(`${RAILWAY}/api/email/poll/${user.uid}`, {
        method: 'POST',
        headers: { 'x-api-key': API_KEY },
      });
      const d = await fetch(`${RAILWAY}/api/email/enquiries/${user.uid}`, {
        headers: { 'x-api-key': API_KEY },
      }).then(r => r.json());
      const found: Enquiry[] = d.enquiries || [];
      setEnquiries(found);
      setFirstPollCount(found.length);
      setFirstPollBanner('done');
      // Auto-hide banner after 8 seconds
      setTimeout(() => setFirstPollBanner(null), 8000);
    } catch {
      setFirstPollBanner(null);
    }
  }, [user.uid]);

  // Handle OAuth return params (passed in from the Suspense boundary below)
  useEffect(() => {
    if (initialConnectedParam === 'gmail') {
      setGmailConnected(true);
      setGmailEmail(initialEmailParam ? decodeURIComponent(initialEmailParam) : 'connected');
      router.replace('/email-guard');
      safeSend(sendMessage, `My Gmail inbox is now connected. What can you do with it and what should I do first?`);
      triggerFirstPoll();
      return;
    }
    if (initialConnectedParam === 'microsoft') {
      setMsConnected(true);
      setMsEmail(initialEmailParam ? decodeURIComponent(initialEmailParam) : 'connected');
      router.replace('/email-guard');
      safeSend(sendMessage, `My Microsoft inbox is now connected. What can you do with it and what should I do first?`);
      triggerFirstPoll();
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
      // Clear URL params immediately to prevent re-processing on remount
      router.replace('/email-guard');
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
            safeSend(sendMessage, `My Microsoft inbox is now connected. What can you do with it and what should I do first?`);
            triggerFirstPoll();
          } else {
            console.error('[MS OAuth] callback error:', d);
            setConnectError(`Microsoft connection failed: ${d.detail || d.error || 'Unknown error'}`);
          }
        })
        .catch((e) => { console.error('[MS OAuth] fetch error:', e); setConnectError('Connection failed — check console for details.'); })
        .finally(() => setConnecting(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save ctaAction to Firestore whenever it changes (skip initial mount)
  const ctaActionRef = useCallback(async (action: string) => {
    const db = getFirebaseDb();
    if (!db) return;
    await setDoc(doc(db, 'users', user.uid), {
      emailSettings: { ctaAction: action },
    }, { merge: true });
  }, [user.uid]);

  // Check connection status + load enquiries on mount
  useEffect(() => {
    // Load ctaAction from Firestore
    const db = getFirebaseDb();
    if (db) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        const data = snap.data();
        if (data?.emailSettings?.ctaAction) {
          setCtaAction(data.emailSettings.ctaAction);
        }
      }).catch(() => {});
    }

    fetch(`${RAILWAY}/api/email/microsoft/status?userId=${user.uid}`, { headers: { 'x-api-key': API_KEY } })
      .then(r => r.json())
      .then(d => { if (d.connected) { setMsConnected(true); setMsEmail(d.email || null); } })
      .catch(() => {});

    fetch(`${RAILWAY}/api/email/gmail/status?userId=${user.uid}`, { headers: { 'x-api-key': API_KEY } })
      .then(r => r.json())
      .then(d => {
        if (d.connected) {
          setGmailConnected(true);
          setGmailEmail(d.email || null);
          // Check if the stored scopes include gmail.send
          const scopes: string = d.scopes || '';
          setGmailHasSendScope(scopes.includes('gmail.send'));
        }
      })
      .catch(() => {});

    // Load existing enquiries first, then auto-sync if inbox is connected
    fetch(`${RAILWAY}/api/email/enquiries/${user.uid}`, { headers: { 'x-api-key': API_KEY } })
      .then(r => r.json())
      .then(d => {
        setEnquiries(d.enquiries || []);
        // Auto-poll on load if already connected (silent — no banner)
        return fetch(`${RAILWAY}/api/email/gmail/status?userId=${user.uid}`, { headers: { 'x-api-key': API_KEY } })
          .then(r => r.json())
          .then(status => {
            if (status.connected) {
              // Trigger a background sync — updates enquiries silently
              fetch(`${RAILWAY}/api/email/poll/${user.uid}`, {
                method: 'POST',
                headers: { 'x-api-key': API_KEY },
              })
                .then(r => r.json())
                .then(() => {
                  // Refresh enquiries after sync
                  fetch(`${RAILWAY}/api/email/enquiries/${user.uid}`, { headers: { 'x-api-key': API_KEY } })
                    .then(r => r.json())
                    .then(d2 => setEnquiries(d2.enquiries || []))
                    .catch(() => {});
                })
                .catch(() => {});
            }
          }).catch(() => {});
      })
      .catch(() => {});

    // Load template performance data
    fetch(`${RAILWAY}/api/analytics/template-performance/${user.uid}`, { headers: { 'x-api-key': API_KEY } })
      .then(r => r.json())
      .then(d => { if (d.verticals?.length) setPerfData(d.verticals); })
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
    // Safe mode — simulate send without emailing anyone
    if (isSafeMode(user.email ?? '')) {
      setSending(eq.id);
      await new Promise(r => setTimeout(r, 1000));
      setEnquiries(prev => prev.map(e => e.id === eq.id ? { ...e, status: 'sent' as const } : e));
      setSending(null);
      return;
    }

    // If only Gmail is connected and it doesn't have send scope, prompt the user
    if (gmailConnected && !msConnected && !gmailHasSendScope) {
      setSendPermModal({ enquiry: eq });
      return;
    }

    setSending(eq.id);
    try {
      const activeVariant = abVariantTab[eq.id] ?? 'A';
      const variantBody = activeVariant === 'B' && eq.abVariantB ? eq.abVariantB : null;
      const variantSubject = activeVariant === 'B' && eq.abVariantBSubject ? eq.abVariantBSubject
        : activeVariant === 'A' && eq.abVariantASubject ? eq.abVariantASubject
        : null;
      const currentBody = editedBody[eq.id] ?? variantBody ?? eq.proposal?.body ?? '';
      const currentSubject = variantSubject ?? `Re: ${eq.subject}`;
      await fetch(`${RAILWAY}/api/email/enquiries/${user.uid}/${eq.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({
          proposalBody: currentBody,
          proposalHtmlBody: eq.proposal?.htmlBody || null,
          subject: currentSubject,
          abVariant: activeVariant,
          abTestId: eq.abTestId,
        }),
      });
      setEnquiries(prev => prev.map(e => e.id === eq.id ? { ...e, status: 'sent' as const } : e));
    } catch {
      // send error — leave status as-is, user can retry
    } finally {
      setSending(null);
    }
  };

  const copyProposal = (eq: Enquiry) => {
    const text = eq.proposal?.body || '';
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(eq.id);
      setTimeout(() => setCopiedId(null), 3000);
    }).catch(() => {});
    setSendPermModal(null);
  };

  const isConnected = msConnected || gmailConnected;

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

      {/* First-poll banner */}
      {firstPollBanner === 'checking' && (
        <div className="flex items-center gap-3 px-8 py-3 bg-[#D4AF37]/10 border-b border-[#D4AF37]/20">
          <div className="w-3.5 h-3.5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-[#D4AF37] font-medium">Checking your inbox for the first time…</p>
        </div>
      )}
      {firstPollBanner === 'done' && (
        <div className="flex items-center gap-3 px-8 py-3 bg-green-500/10 border-b border-green-500/20">
          <span className="text-green-400 text-sm flex-shrink-0">✓</span>
          <p className="text-sm text-green-400 font-medium">
            {firstPollCount && firstPollCount > 0
              ? `Found ${firstPollCount} enquir${firstPollCount === 1 ? 'y' : 'ies'} — proposals are ready below.`
              : "No new enquiries — we'll check again in 5 minutes."}
          </p>
        </div>
      )}

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
              : <button onClick={connectMicrosoft} disabled={connecting} className="text-xs px-4 py-2 bg-[#D4AF37] text-black rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-40">Connect →</button>
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
              : <button onClick={connectGoogle} disabled={connecting} className="text-xs px-4 py-2 bg-[#D4AF37] text-black rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-40">Connect →</button>
            }
          </div>

          {connecting && (
            <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
              <div className="w-3 h-3 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              Connecting…
            </div>
          )}
          <p className="text-xs text-gray-600 px-1">Connect Gmail to read enquiries and send proposals — you control what gets sent.</p>
        </div>

        {/* ── CTA Action Selector (shown when connected) ──────────────── */}
        {isConnected && (
          <section>
            <h2 className="text-sm font-bold text-white mb-1">When a lead replies, what happens?</h2>
            <p className="text-xs text-gray-500 mb-4">Choose the action included in your proposal email.</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'akai_chat',     emoji: '💬', label: 'AKAI Chat',       desc: 'AI qualifies & nurtures them instantly' },
                { id: 'book_time',     emoji: '📅', label: 'Book a time',      desc: 'Show my calendar — they pick a slot' },
                { id: 'sophie_call',   emoji: '📞', label: 'Sophie calls them', desc: 'Instant AI voice outreach' },
                { id: 'connect_human', emoji: '🙋', label: 'Connect me',       desc: 'Route straight to you or your team' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setCtaAction(opt.id);
                    ctaActionRef(opt.id);
                  }}
                  className={`rounded-xl p-4 cursor-pointer transition text-left ${
                    ctaAction === opt.id
                      ? 'border border-[#D4AF37] bg-[#D4AF37]/5'
                      : 'bg-[#111] border border-[#1f1f1f]'
                  }`}
                >
                  <div className="text-xl mb-1">{opt.emoji}</div>
                  <p className="text-sm font-semibold text-white">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── What's Working — Template Performance Panel ──────────────────── */}
        {isConnected && (
          <section>
            <button
              onClick={() => setPerfOpen(o => !o)}
              className="flex items-center gap-2 w-full text-left mb-2"
            >
              <span className="text-sm font-bold text-white">📈 What&apos;s working</span>
              <span className="text-xs text-gray-500 ml-auto">{perfOpen ? '▲ hide' : '▼ show'}</span>
            </button>
            {perfOpen && (
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
                {perfData.length === 0 ? (
                  <p className="text-xs text-gray-500">Send a few proposals to see performance data</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 border-b border-[#1f1f1f]">
                          <th className="text-left pb-2 font-semibold">Vertical</th>
                          <th className="text-right pb-2 font-semibold">Sent</th>
                          <th className="text-right pb-2 font-semibold">Reply Rate</th>
                          <th className="text-right pb-2 font-semibold">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...perfData]
                          .sort((a, b) => b.replyRate - a.replyRate)
                          .slice(0, 4)
                          .map((v, i) => {
                            const isTop = i === 0 && v.replyRate > 0;
                            return (
                              <tr
                                key={v.vertical}
                                className={`border-b border-[#1a1a1a] last:border-0 ${isTop ? 'text-[#D4AF37]' : 'text-white'}`}
                              >
                                <td className="py-2 capitalize">{v.vertical} {isTop ? '🏆' : ''}</td>
                                <td className="py-2 text-right text-gray-400">{v.sentCount}</td>
                                <td className="py-2 text-right">{Math.round((v.replyRate || 0) * 100)}%</td>
                                <td className="py-2 text-right text-gray-400">
                                  {v.replyRate > 0.3 ? '↑↑' : v.replyRate > 0.15 ? '↑' : v.sentCount > 0 ? '—' : '·'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

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

        {/* ── Rules Engine ─────────────────────────────────────────────── */}
        <RulesEngine userId={user.uid} />

        {/* ── Send-permission modal ──────────────────────────────────── */}
        {sendPermModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="bg-[#111] border border-[#D4AF37]/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-white font-bold text-base">Send access needed</p>
                  <p className="text-gray-400 text-sm mt-1">
                    You&apos;ve connected Gmail for reading only. To send proposals directly from AKAI, we need
                    permission to send on your behalf.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={connectGoogle}
                  className="w-full px-4 py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition"
                >
                  Grant send access →
                </button>
                <button
                  onClick={() => copyProposal(sendPermModal.enquiry)}
                  className="w-full px-4 py-3 border border-[#2a2a2a] text-gray-300 rounded-xl text-sm font-semibold hover:text-white hover:border-[#3a3a3a] transition"
                >
                  Copy proposal instead
                </button>
                <button
                  onClick={() => setSendPermModal(null)}
                  className="text-xs text-gray-600 hover:text-gray-400 transition text-center pt-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
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
                          <a
                            href={`/deals/${eq.id}`}
                            onClick={e => e.stopPropagation()}
                            className="text-xs text-gray-600 hover:text-[#D4AF37] transition flex-shrink-0"
                          >
                            View deal →
                          </a>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{eq.from}</p>
                        <p className="text-xs text-gray-600 mt-1 truncate">{eq.body?.slice(0, 80)}…</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {eq.leadScore && (
                          <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${
                            eq.leadScore >= 8 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            eq.leadScore >= 6 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                            'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                          }`}>
                            {eq.leadScore >= 8 ? '🔥' : eq.leadScore >= 6 ? '⚡' : '❄️'} {eq.leadScore}/10
                          </span>
                        )}
                        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${eq.status === 'sent' ? 'bg-green-500/10 text-green-400' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
                          {eq.status === 'sent' ? '✓ Sent' : 'Proposal ready'}
                        </span>
                      </div>
                    </div>
                    {selectedId === eq.id && eq.proposal && (
                      <div className="border-t border-[#1f1f1f] p-4 space-y-3">
                        {/* Preview / Edit toggle */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">AI-generated proposal</p>
                          {eq.proposal.htmlBody && (
                            <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
                              <button
                                onClick={() => setPreviewMode(prev => ({ ...prev, [eq.id]: 'preview' }))}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                                  (previewMode[eq.id] ?? 'preview') === 'preview'
                                    ? 'bg-[#D4AF37] text-black'
                                    : 'text-gray-500 hover:text-white'
                                }`}
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => setPreviewMode(prev => ({ ...prev, [eq.id]: 'edit' }))}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                                  previewMode[eq.id] === 'edit'
                                    ? 'bg-[#D4AF37] text-black'
                                    : 'text-gray-500 hover:text-white'
                                }`}
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>

                        {/* A/B variant selector */}
                        {eq.abVariantB && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
                                <button
                                  onClick={() => { setAbVariantTab(prev => ({ ...prev, [eq.id]: 'A' })); setEditedBody(prev => { const n = { ...prev }; delete n[eq.id]; return n; }); }}
                                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                                    (abVariantTab[eq.id] ?? 'A') === 'A'
                                      ? 'bg-[#D4AF37] text-black'
                                      : 'text-gray-500 hover:text-white'
                                  }`}
                                >
                                  Variant A
                                </button>
                                <button
                                  onClick={() => { setAbVariantTab(prev => ({ ...prev, [eq.id]: 'B' })); setEditedBody(prev => { const n = { ...prev }; delete n[eq.id]; return n; }); }}
                                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                                    abVariantTab[eq.id] === 'B'
                                      ? 'bg-[#D4AF37] text-black'
                                      : 'text-gray-500 hover:text-white'
                                  }`}
                                >
                                  Variant B
                                </button>
                              </div>
                              <span className="text-xs text-gray-500">🧪 A/B testing active — AKAI will learn from the response</span>
                            </div>
                            {(abVariantTab[eq.id] ?? 'A') === 'A' ? (
                              <p className="text-xs text-gray-600">Formal · longer · <em>{eq.abVariantASubject}</em></p>
                            ) : (
                              <p className="text-xs text-gray-600">Casual · punchy · <em>{eq.abVariantBSubject}</em></p>
                            )}
                          </div>
                        )}

                        {/* Preview mode — HTML email (only for Variant A) */}
                        {(previewMode[eq.id] ?? 'preview') === 'preview' && eq.proposal.htmlBody && (abVariantTab[eq.id] ?? 'A') === 'A' ? (
                          <div className="rounded-xl overflow-hidden border border-[#2a2a2a] w-full">
                            <iframe
                              srcDoc={eq.proposal.htmlBody}
                              title="Email preview"
                              style={{ width: '100%', minHeight: '400px', height: 'auto', border: 'none', background: '#fff', display: 'block' }}
                              sandbox="allow-same-origin"
                              onLoad={(e) => {
                                const iframe = e.currentTarget;
                                try {
                                  const h = iframe.contentDocument?.body?.scrollHeight;
                                  if (h) iframe.style.height = h + 'px';
                                } catch {}
                              }}
                            />
                          </div>
                        ) : (
                          /* Edit mode or Variant B — plain text textarea */
                          <textarea
                            className="w-full bg-[#0a0a0a] rounded-xl p-4 text-sm text-white/80 leading-relaxed border border-[#2a2a2a] focus:outline-none focus:border-[#D4AF37]/50 resize-none font-mono"
                            rows={12}
                            value={editedBody[eq.id] ?? ((abVariantTab[eq.id] === 'B' && eq.abVariantB) ? eq.abVariantB : eq.proposal.body)}
                            onChange={e => setEditedBody(prev => ({ ...prev, [eq.id]: e.target.value }))}
                          />
                        )}

                        {eq.status !== 'sent' && (
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => sendProposal(eq)}
                              disabled={sending === eq.id}
                              className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
                            >
                              {sending === eq.id ? '⏳ Sending...' : '✉️ Send this proposal'}
                            </button>
                            {copiedId === eq.id && (
                              <span className="text-xs text-green-400 font-semibold">✓ Copied to clipboard</span>
                            )}
                          </div>
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

function EmailGuardWithParams({ user }: { user: { uid: string; email?: string | null } }) {
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
