'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { isSafeMode } from '@/lib/beta-config';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';
import { useTrackBehaviour } from '@/hooks/useTrackBehaviour';

function safeSend(fn: (t: string) => void, text: string) { try { fn(text); } catch { /* chat not ready */ } }

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL ?? '';
const RAILWAY_API_KEY = process.env.NEXT_PUBLIC_RAILWAY_API_KEY ?? '';

// ── Types ─────────────────────────────────────────────────────────────────

interface Lead {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  created_at?: string;
  status?: string;
  campaign_id?: string;
  call_made?: boolean;
  meeting_booked?: boolean;
  callStatus?: 'pending' | 'calling' | 'completed' | 'failed';
}

interface SalesStats {
  totalLeadsThisMonth: number;
  activeCampaigns: number;
  callsMadeThisWeek: number;
  meetingsBooked: number;
}

interface CallLogEntry {
  id: string;
  leadName: string;
  phone: string;
  time: string;
  duration: string;
  outcome: 'connected' | 'no_answer' | 'converted';
}

interface FollowUpSequence {
  id: string;
  name: string;
  description: string;
  steps: number;
}

interface FollowUpActivationState {
  lastUsed?: string;
  activeLeads: string[];
}

// ── Call Log helpers ──────────────────────────────────────────────────────

const CALL_LOG_KEY = 'akai_call_log';
const FOLLOWUP_KEY = 'akai_followup_sequences';

function getCallLog(): CallLogEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(CALL_LOG_KEY) ?? '[]'); } catch { return []; }
}

function saveCallLog(entries: CallLogEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CALL_LOG_KEY, JSON.stringify(entries));
}

function addCallLogEntries(newEntries: CallLogEntry[]) {
  const existing = getCallLog();
  saveCallLog([...newEntries, ...existing].slice(0, 200));
}

function getFollowUpState(): Record<string, FollowUpActivationState> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(FOLLOWUP_KEY) ?? '{}'); } catch { return {}; }
}

function saveFollowUpState(state: Record<string, FollowUpActivationState>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FOLLOWUP_KEY, JSON.stringify(state));
}

// ── Lead scoring ──────────────────────────────────────────────────────────

function scoreLeadAI(lead: Lead): number {
  let score = 3;
  if (lead.phone) score += 1;
  if (lead.email) score += 1;
  if (lead.meeting_booked) score += 4;
  else if (lead.status === 'qualified') score += 3;
  else if (lead.status === 'contacted' || lead.status === 'called') score += 1;
  if (lead.call_made) score += 1;
  if (lead.id) {
    const hash = lead.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    score += (hash % 3) - 1;
  }
  return Math.max(1, Math.min(10, score));
}

function scoreColor(score: number): string {
  if (score >= 8) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (score >= 6) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (score >= 4) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

function mockCallEntry(lead: Lead): CallLogEntry {
  const outcomes: CallLogEntry['outcome'][] = ['connected', 'connected', 'no_answer', 'converted'];
  const durations = ['0m 45s', '1m 12s', '2m 03s', '0m 22s', '3m 18s', '1m 55s'];
  const hash = (lead.id ?? lead.name ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    id: `call-${Date.now()}-${hash}`,
    leadName: lead.name || 'Unknown',
    phone: lead.phone || '—',
    time: new Date().toISOString(),
    duration: durations[hash % durations.length]!,
    outcome: outcomes[hash % outcomes.length]!,
  };
}

// ── Pipeline helpers ──────────────────────────────────────────────────────

function timeSince(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ''; }
}

function formatCallTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function getLeadColumn(lead: Lead): 'new' | 'called' | 'qualified' | 'booked' {
  if (lead.meeting_booked || lead.status === 'booked') return 'booked';
  if (lead.status === 'qualified') return 'qualified';
  if (lead.call_made || lead.status === 'contacted' || lead.status === 'called') return 'called';
  return 'new';
}

// ── Stat Card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, sublabel }: { label: string; value: number | string; icon: string; sublabel: string }) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col gap-2 hover:border-[#D4AF37]/20 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-xs text-gray-600">{sublabel}</p>
    </div>
  );
}

// ── Quick Action Card ─────────────────────────────────────────────────────

function QuickAction({ icon, label, description, href, chatPrompt }: { icon: string; label: string; description: string; href: string; chatPrompt?: string }) {
  const { sendMessage } = useDashboardChat();
  const handleClick = chatPrompt
    ? (e: React.MouseEvent) => { e.preventDefault(); safeSend(sendMessage, chatPrompt); }
    : undefined;
  return (
    <a
      href={href}
      onClick={handleClick}
      className="flex items-center gap-4 bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 hover:border-[#D4AF37]/30 hover:bg-[#141414] transition-colors group cursor-pointer"
    >
      <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-[#D4AF37]/20 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <span className="text-gray-600 group-hover:text-[#D4AF37] transition-colors text-sm">→</span>
    </a>
  );
}

// ── Call Status Badge ─────────────────────────────────────────────────────

function CallStatusBadge({ status }: { status?: Lead['callStatus'] }) {
  if (!status || status === 'pending') {
    return <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-500/10 text-gray-400 border-gray-500/20">Pending</span>;
  }
  if (status === 'calling') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        Calling…
      </span>
    );
  }
  if (status === 'completed') {
    return <span className="text-[11px] px-2 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/20">✓ Called</span>;
  }
  return <span className="text-[11px] px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">Failed</span>;
}

// ── Score Badge ───────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${scoreColor(score)}`} title={`AI score: ${score}/10`}>
      {score}
    </span>
  );
}

// ── Lead Card ─────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (leadId: string, status: string, meetingBooked?: boolean) => void;
  score: number;
}

function LeadCard({ lead, onStatusChange, score }: LeadCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const statusColors: Record<string, string> = {
    new: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    contacted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    called: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    qualified: 'bg-green-500/10 text-green-400 border-green-500/20',
    booked: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  const currentStatus = lead.meeting_booked ? 'booked' : (lead.status || 'new');
  const colorClass = statusColors[currentStatus] || statusColors.new;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="w-full text-left p-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl hover:border-[#D4AF37]/30 transition-colors group"
      >
        <div className="flex items-start gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-xs font-bold text-[#D4AF37] flex-shrink-0">
            {(lead.name || '?')[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{lead.name || 'Unknown'}</p>
            {lead.phone && <p className="text-[11px] text-gray-500 truncate">{lead.phone}</p>}
            {lead.email && <p className="text-[11px] text-gray-600 truncate">{lead.email}</p>}
          </div>
          <ScoreBadge score={score} />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${colorClass}`}>
            {currentStatus}
          </span>
          {lead.created_at && (
            <span className="text-[10px] text-gray-600" suppressHydrationWarning>
              {timeSince(lead.created_at)}
            </span>
          )}
        </div>
      </button>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-5 w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-sm">{lead.name || 'Lead'}</h3>
                <ScoreBadge score={score} />
              </div>
              <button onClick={() => setModalOpen(false)} aria-label="Close" className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            {lead.phone && <p className="text-xs text-gray-500 mb-1">📞 {lead.phone}</p>}
            {lead.email && <p className="text-xs text-gray-600 mb-4">✉️ {lead.email}</p>}
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Move to column</p>
            <div className="space-y-2">
              {[
                { label: 'New Lead', status: 'new', meetingBooked: false },
                { label: 'Called', status: 'contacted', meetingBooked: false },
                { label: 'Qualified', status: 'qualified', meetingBooked: false },
                { label: 'Booked', status: 'booked', meetingBooked: true },
              ].map(opt => (
                <button
                  key={opt.status}
                  onClick={() => {
                    if (lead.id) onStatusChange(lead.id, opt.status, opt.meetingBooked);
                    setModalOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                    currentStatus === opt.status
                      ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#3a3a3a]'
                  }`}
                >
                  {opt.label}{currentStatus === opt.status && ' ✓'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Empty Leads State ─────────────────────────────────────────────────────

function EmptyLeadsState() {
  const router = useRouter();
  const { sendMessage } = useDashboardChat();

  const actions = [
    {
      icon: '🛡️',
      label: 'Connect Email Guard',
      description: 'Capture leads from your inbox automatically',
      onClick: () => router.push('/email-guard'),
      primary: false,
    },
    {
      icon: '📞',
      label: 'Trigger Sophie',
      description: 'Let Sophie AI start calling prospects',
      onClick: () => safeSend(sendMessage, 'I want to trigger Sophie AI to start calling leads'),
      primary: false,
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <p className="text-5xl mb-4">🎯</p>
      <p className="text-white font-black text-lg mb-2">No leads yet — launch your first campaign</p>
      <p className="text-gray-500 text-sm mb-8 max-w-[320px]">
        Import a list, connect your inbox, or let Sophie AI hunt for prospects. Your pipeline starts here.
      </p>
      <button
        onClick={() => document.getElementById('lead-upload')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="mb-5 flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition shadow-lg shadow-[#D4AF37]/20"
      >
        📁 Import leads now →
      </button>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        {actions.map(a => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="flex-1 flex flex-col items-center gap-2 p-4 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl hover:border-[#D4AF37]/30 hover:bg-[#141414] transition-colors group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">{a.icon}</span>
            <p className="text-sm font-bold text-white">{a.label}</p>
            <p className="text-[11px] text-gray-500">{a.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Pipeline Board ────────────────────────────────────────────────────────

interface PipelineBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: string, meetingBooked?: boolean) => void;
}

function PipelineBoard({ leads, onStatusChange }: PipelineBoardProps) {
  const [hotOnly, setHotOnly] = useState(false);

  const columns = [
    { id: 'new', label: 'New Lead', color: 'border-gray-600/30 text-gray-400', dot: 'bg-gray-400' },
    { id: 'called', label: 'Called', color: 'border-blue-500/30 text-blue-400', dot: 'bg-blue-400' },
    { id: 'qualified', label: 'Qualified', color: 'border-green-500/30 text-green-400', dot: 'bg-green-400' },
    { id: 'booked', label: 'Booked', color: 'border-purple-500/30 text-purple-400', dot: 'bg-purple-400' },
  ];

  // All hooks must be called before any early returns (Rules of Hooks)
  const scoredLeads = useMemo(() => (leads ?? []).map(l => ({ lead: l, score: scoreLeadAI(l) })), [leads]);
  const displayLeads = useMemo(() => hotOnly ? scoredLeads.filter(({ score }) => score >= 7) : scoredLeads, [hotOnly, scoredLeads]);
  const hotCount = useMemo(() => scoredLeads.filter(({ score }) => score >= 7).length, [scoredLeads]);

  if (!leads || leads.length === 0) {
    return <EmptyLeadsState />;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setHotOnly(false)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${!hotOnly ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]' : 'border-[#2a2a2a] text-gray-500 hover:text-white hover:border-[#3a3a3a]'}`}
        >
          All leads ({leads.length})
        </button>
        <button
          onClick={() => setHotOnly(true)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${hotOnly ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'border-[#2a2a2a] text-gray-500 hover:text-white hover:border-[#3a3a3a]'}`}
        >
          🔥 Hot leads ({hotCount})
        </button>
      </div>

      {displayLeads.length === 0 && hotOnly ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-gray-500 text-sm">No hot leads yet.</p>
          <p className="text-gray-700 text-xs mt-1">Hot leads are scored 7+. Keep calling!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {columns.map(col => {
            const colLeads = displayLeads.filter(({ lead }) => getLeadColumn(lead) === col.id);
            return (
              <div key={col.id} className="flex flex-col gap-2">
                <div className={`flex items-center gap-2 pb-2 border-b ${col.color}`}>
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                  <span className="ml-auto text-xs opacity-60">{colLeads.length}</span>
                </div>
                {colLeads.length === 0 ? (
                  <div className="flex items-center justify-center py-8 border border-dashed border-[#2a2a2a] rounded-xl">
                    <p className="text-xs text-gray-700 text-center px-2">No leads here yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {colLeads.map(({ lead, score }, i) => (
                      <LeadCard key={lead.id ?? i} lead={lead} score={score} onStatusChange={onStatusChange} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Call Log Tab ──────────────────────────────────────────────────────────

function CallLogTab() {
  const [entries, setEntries] = useState<CallLogEntry[]>([]);

  useEffect(() => {
    setEntries(getCallLog());
    const onStorage = (e: StorageEvent) => {
      if (e.key === CALL_LOG_KEY) setEntries(getCallLog());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const outcomeBadge = (outcome: CallLogEntry['outcome']) => {
    if (outcome === 'converted') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (outcome === 'connected') return 'bg-green-500/10 text-green-400 border-green-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const outcomeLabel = (outcome: CallLogEntry['outcome']) => {
    if (outcome === 'converted') return '🏆 Converted';
    if (outcome === 'connected') return '✅ Connected';
    return '📵 No Answer';
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <span className="text-3xl mb-3">📵</span>
        <p className="text-white font-bold text-sm mb-1">No calls yet</p>
        <p className="text-gray-600 text-xs max-w-[240px]">
          No calls yet — trigger Sophie above to start calling
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{entries.length} call{entries.length !== 1 ? 's' : ''} logged</p>
        <button
          onClick={() => { saveCallLog([]); setEntries([]); }}
          className="text-xs text-gray-600 hover:text-red-400 transition-colors"
        >
          Clear log
        </button>
      </div>
      <div className="divide-y divide-[#1a1a1a]">
        {entries.map(entry => (
          <div key={entry.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-xs font-bold text-[#D4AF37] flex-shrink-0">
              {entry.leadName[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{entry.leadName}</p>
              <p className="text-[11px] text-gray-500">{entry.phone}</p>
            </div>
            <div className="text-right flex-shrink-0 hidden sm:block">
              <p className="text-[11px] text-gray-500" suppressHydrationWarning>{formatCallTime(entry.time)}</p>
              <p className="text-[11px] text-gray-700">{entry.duration}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${outcomeBadge(entry.outcome)}`}>
              {outcomeLabel(entry.outcome)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Follow-up Sequences ───────────────────────────────────────────────────

const PRESET_SEQUENCES: FollowUpSequence[] = [
  { id: 'drip-3day', name: '3-day drip', description: 'Day 1 call → Day 2 email → Day 3 SMS nudge', steps: 3 },
  { id: 'weekly-checkin', name: 'Weekly check-in', description: 'Gentle weekly touchpoint for warm leads', steps: 3 },
  { id: 'post-call', name: 'Post-call follow-up', description: 'Email recap → LinkedIn connect → 3-day callback', steps: 4 },
];

function FollowUpSequences({ leads }: { leads: Lead[] }) {
  const [states, setStates] = useState<Record<string, FollowUpActivationState>>({});
  const [confirmSeq, setConfirmSeq] = useState<FollowUpSequence | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    setStates(getFollowUpState());
  }, []);

  const handleActivate = async (seq: FollowUpSequence) => {
    setActivating(seq.id);
    await new Promise(r => setTimeout(r, 1000));
    const newState: FollowUpActivationState = {
      lastUsed: new Date().toISOString(),
      activeLeads: leads.map(l => l.id ?? '').filter(Boolean),
    };
    const updated = { ...states, [seq.id]: newState };
    setStates(updated);
    saveFollowUpState(updated);
    setActivating(null);
    setConfirmSeq(null);
  };

  return (
    <section>
      <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Follow-up Sequences</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PRESET_SEQUENCES.map(seq => {
          const state = states[seq.id];
          const isActive = !!state;
          return (
            <div key={seq.id} className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 flex flex-col gap-3 hover:border-[#D4AF37]/20 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-white">{seq.name}</p>
                  {isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/20 font-semibold">Active</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">{seq.description}</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-600">
                <span>📋 {seq.steps} steps</span>
                {state?.lastUsed && (
                  <span suppressHydrationWarning>🕐 {timeSince(state.lastUsed)}</span>
                )}
              </div>
              <button
                onClick={() => setConfirmSeq(seq)}
                className="mt-auto px-3 py-2 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-xl text-xs font-bold hover:bg-[#D4AF37]/20 transition-colors"
              >
                {isActive ? 'Re-activate →' : 'Activate →'}
              </button>
            </div>
          );
        })}
      </div>

      {confirmSeq && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setConfirmSeq(null)}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm">Activate: {confirmSeq.name}</h3>
              <button onClick={() => setConfirmSeq(null)} aria-label="Close" className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-gray-500 mb-2">{confirmSeq.description}</p>
            <p className="text-xs text-gray-400 mb-4">
              This sequence will apply to <strong className="text-white">{leads.length} lead{leads.length !== 1 ? 's' : ''}</strong> in your pipeline.
            </p>
            {leads.length === 0 && (
              <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-4">
                ⚠️ No leads in pipeline. Add leads first.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmSeq(null)}
                className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-sm font-semibold hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleActivate(confirmSeq)}
                disabled={activating === confirmSeq.id || leads.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {activating === confirmSeq.id ? (
                  <><span role="status" aria-label="Loading" className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Activating…</>
                ) : (
                  'Confirm & Activate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Plan lead limits ──────────────────────────────────────────────────────
const PLAN_LEAD_LIMITS: Record<string, number> = {
  starter: 50,
  growth: 150,
  scale: 500,
  trial: 20,
};
const EXTRA_LEAD_PRICE = 3;

// ── Lead Upload Section ───────────────────────────────────────────────────

function LeadUploadSection({ userId, businessName, plan = 'starter', userEmail = '', onCallsLaunched }: {
  userId: string;
  businessName: string;
  plan?: string;
  userEmail?: string;
  onCallsLaunched?: () => void;
}) {
  const { track } = useTrackBehaviour();
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [uploadedLeads, setUploadedLeads] = useState<Lead[]>([]);
  const [campaignName, setCampaignName] = useState('Campaign 1');

  // Load previously uploaded leads from Firestore on mount
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { getFirebaseDb } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const db = getFirebaseDb();
        if (!db) return;
        const snap = await getDoc(doc(db, 'users', userId, 'salesLeads', 'uploaded'));
        if (snap.exists()) {
          const data = snap.data() as { leads?: Lead[] };
          if (data.leads && data.leads.length > 0) {
            setUploadedLeads(data.leads);
          }
        }
      } catch { /* non-fatal */ }
    })();
  }, [userId]);
  const [launching, setLaunching] = useState(false);
  const [dncResult] = useState<{ safe: string[]; blocked: string[] } | null>(null);

  const [launchResult, setLaunchResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const leadLimit = PLAN_LEAD_LIMITS[plan] ?? 50;
  const excessLeads = Math.max(0, uploadedLeads.length - leadLimit);
  const extraCost = excessLeads * EXTRA_LEAD_PRICE;

  const addManualLead = () => {
    if (!form.name && !form.phone) return;
    const newLead: Lead = {
      id: Date.now().toString(),
      name: form.name,
      phone: form.phone,
      email: form.email,
      callStatus: 'pending',
    };
    setUploadedLeads(prev => [...prev, newLead]);
    setForm({ name: '', phone: '', email: '' });
  };

  const removeLead = (id: string) => {
    setUploadedLeads(prev => prev.filter(l => l.id !== id));
  };

  const parseCsv = (text: string) => {
    const lines = text.trim().split('\n');
    const headers = (lines[0] ?? '').toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const nameIdx = headers.findIndex(h => h.includes('name'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile'));
    const emailIdx = headers.findIndex(h => h.includes('email'));
    const parsed: Lead[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = (lines[i] ?? '').split(',').map(c => c.trim().replace(/"/g, ''));
      if (cols.length < 2) continue;
      parsed.push({
        id: `csv-${i}`,
        name: nameIdx >= 0 ? cols[nameIdx] : '',
        phone: phoneIdx >= 0 ? cols[phoneIdx] : '',
        email: emailIdx >= 0 ? cols[emailIdx] : '',
        callStatus: 'pending',
      });
    }
    return parsed;
  };

  const saveLeadsToFirestore = async (leads: Lead[]) => {
    try {
      const { getFirebaseDb } = await import('@/lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      const db = getFirebaseDb();
      if (db && userId) {
        await setDoc(doc(db, 'users', userId, 'salesLeads', 'uploaded'), { leads, updatedAt: new Date().toISOString() }, { merge: false });
      }
    } catch { /* non-fatal */ }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      setUploadedLeads(prev => {
        const updated = [...prev, ...parsed];
        saveLeadsToFirestore(updated);
        track('leads_uploaded', { count: updated.length, source: 'csv' });
        return updated;
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };



  const launchCampaign = async () => {
    if (uploadedLeads.length === 0 || launching) return;
    track('campaign_launched', { leadCount: uploadedLeads.length, campaign: campaignName });

    if (isSafeMode(userEmail)) {
      setLaunching(true);
      await new Promise(r => setTimeout(r, 1500));
      setUploadedLeads(prev => prev.map(l => ({ ...l, callStatus: 'completed' as const })));
      addCallLogEntries(uploadedLeads.map(mockCallEntry));
      onCallsLaunched?.();
      setLaunchResult({ success: true, message: `✅ Safe mode: Campaign simulated for ${uploadedLeads.length} leads. No calls were made (beta testing mode).` });
      setLaunching(false);
      return;
    }

    setLaunching(true);
    setLaunchResult(null);

    const safeLeads = dncResult
      ? uploadedLeads.filter(l => l.phone && !dncResult.blocked.includes(l.phone))
      : uploadedLeads;

    if (safeLeads.length === 0) {
      setLaunchResult({ success: false, message: 'All numbers are on the Do Not Call register — no leads to call.' });
      setLaunching(false);
      return;
    }

    setUploadedLeads(prev => prev.map(l => ({ ...l, callStatus: 'calling' as const })));

    const script = `Hi {{name}}, this is Sophie from ${businessName || '[businessName]'}. I'm reaching out because we help businesses like yours generate more leads and close more deals using AI. Do you have 2 minutes to chat?`;

    try {
      const res = await fetch(`${RAILWAY_API}/api/campaign/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
        body: JSON.stringify({
          leads: safeLeads.map(l => ({ name: l.name || '', phone: l.phone || '', email: l.email || '' })),
          script,
          userId,
          campaignName,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setUploadedLeads(prev => prev.map(l => ({ ...l, callStatus: 'completed' as const })));
      addCallLogEntries(safeLeads.map(mockCallEntry));
      onCallsLaunched?.();
      setLaunchResult({ success: true, message: data.message || `Campaign launched! ${uploadedLeads.length} leads queued for Sophie AI.` });
    } catch (err) {
      setUploadedLeads(prev => prev.map(l => ({ ...l, callStatus: 'failed' as const })));
      setLaunchResult({ success: false, message: 'Launch failed — check your connection and try again.' });
      console.error('[CAMPAIGN]', err);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <section id="lead-upload">
      <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
        Lead Upload &amp; Campaign
      </h2>
      <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('manual')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${mode === 'manual' ? 'bg-[#D4AF37] text-black' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}
          >
            ✍️ Manual Add
          </button>
          <button
            onClick={() => setMode('csv')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${mode === 'csv' ? 'bg-[#D4AF37] text-black' : 'bg-[#1a1a1a] text-gray-400 hover:text-white'}`}
          >
            📁 Upload CSV
          </button>
        </div>

        {mode === 'manual' && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input type="text" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addManualLead()} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors" />
            <input type="tel" autoComplete="tel" placeholder="Phone (+61...)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addManualLead()} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors" />
            <input type="email" autoComplete="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addManualLead()} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors" />
            <button onClick={addManualLead} disabled={!form.name && !form.phone} className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl text-sm font-semibold hover:border-[#D4AF37]/40 transition-colors disabled:opacity-40">
              + Add Lead
            </button>
          </div>
        )}

        {mode === 'csv' && (
          <div>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-6 py-4 border-2 border-dashed border-[#2a2a2a] rounded-xl text-sm text-gray-400 hover:border-[#D4AF37]/40 hover:text-white transition-colors w-full justify-center">
              <span className="text-xl">📎</span>
              <span>Click to upload CSV (name, phone, email columns)</span>
            </button>
            <p className="text-xs text-gray-600 mt-2">Expects headers: name, phone/mobile, email — first row is header</p>
          </div>
        )}

        {uploadedLeads.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{uploadedLeads.length} lead{uploadedLeads.length !== 1 ? 's' : ''} queued</p>
              <button onClick={() => setUploadedLeads([])} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Clear all</button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {uploadedLeads.map((lead, i) => (
                <div key={lead.id ?? i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]">
                  <div className="w-7 h-7 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-xs text-[#D4AF37] font-bold flex-shrink-0">
                    {(lead.name || '?')[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{lead.name || '—'}</p>
                    <p className="text-xs text-gray-500">{lead.phone}{lead.email ? ` · ${lead.email}` : ''}</p>
                  </div>
                  <CallStatusBadge status={lead.callStatus} />
                  {lead.callStatus === 'pending' && (
                    <button onClick={() => removeLead(lead.id!)} aria-label="Remove lead" className="text-gray-600 hover:text-red-400 transition-colors text-sm ml-1" title="Remove">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadedLeads.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-[#1f1f1f]">
            <input type="text" placeholder="Campaign name" value={campaignName} onChange={e => setCampaignName(e.target.value)} className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors" />
            <button
              onClick={launchCampaign}
              disabled={launching || uploadedLeads.length === 0}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-[#D4AF37]/20"
            >
              {launching ? (
                <><span role="status" aria-label="Loading" className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Launching…</>
              ) : (
                <>📞 Start Calling ({uploadedLeads.length})</>
              )}
            </button>
          </div>
        )}

        {uploadedLeads.length > leadLimit && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-sm">
            <p className="text-yellow-300 font-semibold">⚠️ Over plan limit</p>
            <p className="text-yellow-400/80 text-xs mt-1">
              Your <strong>{plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> plan includes <strong>{leadLimit} leads/mo</strong>.
              You&apos;ve added {uploadedLeads.length} — that&apos;s <strong>{excessLeads} extra at ${EXTRA_LEAD_PRICE}/each = ${extraCost}</strong>.
            </p>
            <button className="mt-2 text-xs text-yellow-300 underline hover:text-yellow-200">
              Generate payment link for {excessLeads} extra leads →
            </button>
          </div>
        )}

        {launchResult && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
            launchResult.success
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <span>{launchResult.success ? '✅' : '❌'}</span>
            <span>{launchResult.message}</span>
          </div>
        )}
      </div>
    </section>
  );
}

// ── CTA Banner ────────────────────────────────────────────────────────────

function CTASection() {
  const { sendMessage } = useDashboardChat();
  return (
    <section>
      <div className="relative rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/5 to-transparent p-6 flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/[0.03] to-transparent pointer-events-none" />
        <div className="relative">
          <p className="font-black text-white text-lg">Ready to close more deals?</p>
          <p className="text-gray-500 text-sm mt-1">Upload leads above or ask AK to get Sophie calling for you.</p>
        </div>
        <button
          onClick={() => safeSend(sendMessage, 'I want to close more deals — help me launch a campaign with Sophie AI')}
          className="relative flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity shadow-lg shadow-[#D4AF37]/20"
        >
          Ask AK →
        </button>
      </div>
    </section>
  );
}

// ── AKAI Prospects Section ────────────────────────────────────────────────

interface Prospect { id: number; name: string; email: string; phone: string; website: string; status: string; subject: string; industry?: string; location?: string; }

interface SenderProfile { name: string; email: string; businessName: string; }

function buildOutreachEmail(p: Prospect, sender?: SenderProfile): { subject: string; body: string } {
  const businessName = p.name || 'your business';
  const industry = p.industry ? `in the ${p.industry} space` : 'in your industry';
  const locationLine = p.location ? ` based in ${p.location}` : '';
  const websiteLine = p.website ? `\n\nI had a look at ${p.website} — ` : '\n\n';
  const websiteSegue = p.website
    ? `${websiteLine}great work. I wanted to reach out about something that could directly impact your lead flow.`
    : `${websiteLine}I came across ${businessName} and wanted to reach out directly.`;

  const senderName = sender?.name || sender?.businessName || 'The Team';
  const senderBiz = sender?.businessName || 'AKAI';
  const senderEmail = sender?.email || 'hello@getakai.ai';

  const subject = p.subject || `Quick question — ${businessName}`;
  const body = [
    `Hi,`,
    ``,
    websiteSegue,
    ``,
    `We built AKAI for businesses like yours${locationLine} — ${industry}. The problem we solve: most businesses lose leads after hours, on weekends, or whenever the team is tied up. AKAI handles those enquiries instantly — qualifies them, books calls, and follows up automatically.`,
    ``,
    `No extra staff. No missed opportunities. Just more revenue from leads you're already getting.`,
    ``,
    `Would you be open to a 10-minute call this week? I'll show you exactly how it works for ${businessName}.`,
    ``,
    senderName,
    senderBiz,
    `getakai.ai | ${senderEmail}`,
  ].join('\n');

  return { subject, body };
}

// ── Send Email Modal ──────────────────────────────────────────────────────

interface SendEmailModalProps {
  prospect: Prospect;
  senderProfile: SenderProfile;
  uid: string;
  inboxEmail: string;
  inboxProvider: 'gmail' | 'microsoft' | null;
  onClose: () => void;
  onSent: (prospectId: number) => void;
}

function SendEmailModal({
  prospect,
  senderProfile,
  uid,
  inboxEmail,
  inboxProvider,
  onClose,
  onSent,
}: SendEmailModalProps) {
  const { subject: defaultSubject, body: defaultBody } = buildOutreachEmail(prospect, senderProfile);
  const [subject, setSubject] = useState(defaultSubject);
  const [emailBody, setEmailBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!prospect.email) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/sales/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, to: prospect.email, subject, body: emailBody }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setSent(true);
        onSent(prospect.id);
        setTimeout(() => onClose(), 1800);
      } else {
        setSendError(data.error ?? 'Send failed — please try again');
      }
    } catch {
      setSendError('Network error — please try again');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm">Send email to {prospect.name}</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Inbox status */}
        {inboxProvider ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
            <span className="text-green-400 text-sm">{inboxProvider === 'gmail' ? '📧' : '📮'}</span>
            <p className="text-xs text-green-400">
              Send from: <span className="font-semibold">{inboxEmail || inboxProvider}</span>
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-xs text-yellow-400">⚠️ No inbox connected — connect first to send</p>
            <a href="/email-guard" className="text-xs text-[#D4AF37] underline hover:text-yellow-300 transition">Connect →</a>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wider">To</label>
          <p className="text-sm text-white px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl truncate">{prospect.email}</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wider">Subject</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wider">Message</label>
          <textarea
            value={emailBody}
            onChange={e => setEmailBody(e.target.value)}
            rows={8}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors resize-none leading-relaxed"
          />
        </div>

        {sendError && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
            <span className="text-red-400 text-sm">❌</span>
            <p className="text-xs text-red-400">{sendError}</p>
          </div>
        )}

        {sent && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
            <span className="text-green-400 text-sm">✅</span>
            <p className="text-xs text-green-400 font-semibold">Email sent!</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-sm font-semibold hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || sent || !inboxProvider}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sending ? (
              <><span role="status" aria-label="Sending" className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Sending…</>
            ) : sent ? (
              '✅ Sent!'
            ) : (
              'Send email →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, { label: string; style: string }> = {
  not_contacted:  { label: 'Not contacted', style: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  contacted:      { label: 'Contacted',     style: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  replied:        { label: 'Replied',       style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  qualified:      { label: 'Qualified',     style: 'bg-green-500/10 text-green-400 border-green-500/20' },
  closed:         { label: 'Closed',        style: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  not_interested: { label: 'Not interested',style: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function ProspectsSection() {
  const { track } = useTrackBehaviour();
  const { user, userProfile } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);
  const [emailedIds, setEmailedIds] = useState<Set<number>>(new Set());
  const [sendModal, setSendModal] = useState<Prospect | null>(null);
  const [inboxEmail, setInboxEmail] = useState('');
  const [inboxProvider, setInboxProvider] = useState<'gmail' | 'microsoft' | null>(null);

  const senderProfile: SenderProfile = useMemo(() => ({
    name: (userProfile as { displayName?: string } | null)?.displayName || (userProfile as { businessName?: string } | null)?.businessName || user?.displayName || '',
    email: user?.email || '',
    businessName: (userProfile as { businessName?: string } | null)?.businessName || '',
  }), [userProfile, user?.displayName, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Read connected inbox from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirebaseDb();
    if (!db) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data() ?? {};
        if ((data.gmail as { connected?: boolean; accessToken?: string } | undefined)?.connected === true ||
            (data.gmail as { accessToken?: string } | undefined)?.accessToken) {
          setInboxEmail(((data.gmail as { email?: string }) ?? {}).email ?? '');
          setInboxProvider('gmail');
        } else if (
          (data.inboxConnection as { provider?: string } | undefined)?.provider === 'microsoft' ||
          (data.inboxConnection as { accessTokenEnc?: string } | undefined)?.accessTokenEnc ||
          (data.inboxConnection as { accessToken?: string } | undefined)?.accessToken
        ) {
          setInboxEmail(((data.inboxConnection as { email?: string }) ?? {}).email ?? '');
          setInboxProvider('microsoft');
        }
      } catch (err) {
        console.error('[ProspectsSection] Firestore inbox read failed:', err);
      }
    })();
  }, [user?.uid]);

  const copyEmailToClipboard = useCallback((p: Prospect) => {
    const { subject, body } = buildOutreachEmail(p, senderProfile);
    const text = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text).catch(() => {});
  }, [senderProfile]);

  useEffect(() => {
    if (!user?.uid) return;
    fetch(`/api/prospects?userId=${user.uid}`).then(r => r.json()).then(d => {
      setProspects(d.prospects ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.uid]);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    await fetch('/api/prospects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }).catch(() => {});
    setUpdating(null);
  };

  const filtered = useMemo(() => prospects.filter(p => {
    const matchFilter = filter === 'all' || p.status === filter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  }), [prospects, filter, search]);

  const counts = useMemo(() => ({
    total: prospects.length,
    not_contacted: prospects.filter(p => p.status === 'not_contacted').length,
    contacted: prospects.filter(p => p.status === 'contacted').length,
    qualified: prospects.filter(p => p.status === 'qualified').length,
  }), [prospects]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">AKAI Prospects</h2>
          <p className="text-xs text-gray-600 mt-0.5">{counts.total} prospects · {counts.not_contacted} not contacted · {counts.contacted} contacted · {counts.qualified} qualified</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search prospects..." className="bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition w-48" />
        {['all', 'not_contacted', 'contacted', 'replied', 'qualified', 'closed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${filter === f ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]' : 'border-[#2a2a2a] text-gray-500 hover:text-white hover:border-[#3a3a3a]'}`}>
            {f === 'all' ? 'All' : STATUS_STYLES[f]?.label ?? f}
          </button>
        ))}
      </div>

      <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div role="status" aria-label="Loading" className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">No prospects match your filter.</div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {filtered.map(p => {
              const statusInfo = STATUS_STYLES[p.status] ?? STATUS_STYLES['not_contacted'] ?? { label: p.status, style: '' };
              return (
                <div key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#141414] transition-colors group">
                  <div className="w-7 h-7 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-xs font-bold text-[#D4AF37] flex-shrink-0">{p.id}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {p.email && <a href={`mailto:${p.email}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-[#D4AF37] transition truncate max-w-[200px]">{p.email}</a>}
                      {p.phone && <span className="text-xs text-gray-600">{p.phone}</span>}
                      {p.website && <a href={`https://${p.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-white transition">{p.website}</a>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusInfo.style}`}>{statusInfo.label}</span>
                    <select
                      value={p.status}
                      onChange={e => updateStatus(p.id, e.target.value)}
                      disabled={updating === p.id}
                      className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-gray-400 focus:outline-none focus:border-[#D4AF37] transition opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      {Object.entries(STATUS_STYLES).map(([val, info]) => <option key={val} value={val}>{info.label}</option>)}
                    </select>
                    {p.email && (
                      <div className="flex items-center gap-1">
                        {emailedIds.has(p.id) && (
                          <span className="text-[10px] text-green-400 font-semibold">✅</span>
                        )}
                        <button
                          onClick={() => { track('email_send_modal_opened', { prospectId: String(p.id) }); setSendModal(p); }}
                          className="text-xs px-2.5 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-lg hover:bg-[#D4AF37]/20 transition opacity-0 group-hover:opacity-100 font-semibold"
                        >
                          {emailedIds.has(p.id) ? 'Resend →' : 'Send →'}
                        </button>
                        <button
                          onClick={() => copyEmailToClipboard(p)}
                          title="Copy subject + body to clipboard"
                          className="text-xs px-2 py-1 bg-[#111] border border-[#2a2a2a] text-gray-400 rounded-lg hover:text-white hover:border-[#3a3a3a] transition opacity-0 group-hover:opacity-100"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sendModal && user && (
        <SendEmailModal
          prospect={sendModal}
          senderProfile={senderProfile}
          uid={user.uid}
          inboxEmail={inboxEmail}
          inboxProvider={inboxProvider}
          onClose={() => setSendModal(null)}
          onSent={(id) => {
            setEmailedIds(prev => new Set([...prev, id]));
            updateStatus(id, 'contacted');
            setSendModal(null);
          }}
        />
      )}
    </section>
  );
}

// ── Outbound Prospects Tab ────────────────────────────────────────────────

interface OutboundProspect {
  id: string;
  businessName: string;
  website?: string;
  phone?: string;
  email?: string;
  location: string;
  vertical: string;
  enrichmentScore: number;
  outreachStatus: 'queued' | 'contacted' | 'replied' | 'converted' | 'rejected';
  createdAt?: string;
}

const TARGET_VERTICALS_LIST = [
  'luxury kitchens', 'interior design', 'yacht charter', 'marine',
  'legal', 'accounting', 'real estate', 'recruitment', 'construction', 'landscaping',
];

const OUTREACH_STATUS_BADGES: Record<string, { label: string; style: string }> = {
  queued:    { label: '🟡 Queued',    style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  contacted: { label: '📧 Contacted', style: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  replied:   { label: '💬 Replied',   style: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  converted: { label: '✅ Converted', style: 'bg-green-500/10 text-green-400 border-green-500/20' },
  rejected:  { label: '❌ Rejected',  style: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function EnrichmentBar({ score }: { score: number }) {
  const pct = Math.round((score / 10) * 100);
  const color = score >= 7 ? 'bg-green-400' : score >= 4 ? 'bg-yellow-400' : 'bg-gray-500';
  return (
    <div className="flex items-center gap-2" title={`Enrichment: ${score}/10`}>
      <div className="w-16 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-500">{score}/10</span>
    </div>
  );
}

function OutboundProspectsTab({ userId }: { userId: string }) {
  const [prospects, setProspects] = useState<OutboundProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [outreachSentId, setOutreachSentId] = useState<string | null>(null);
  const [form, setForm] = useState({ businessName: '', website: '', location: 'Sydney', vertical: '', email: '' });
  const [adding, setAdding] = useState(false);

  const fetchProspects = async () => {
    try {
      const res = await fetch(`${RAILWAY_API}/api/analytics/prospects/${userId}`, {
        headers: { 'x-api-key': RAILWAY_API_KEY },
      });
      const data = await res.json();
      setProspects(data.prospects ?? []);
    } catch {
      setProspects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProspects(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!form.businessName) return;
    setAdding(true);
    try {
      const res = await fetch(`${RAILWAY_API}/api/analytics/prospects/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setAddModalOpen(false);
        setForm({ businessName: '', website: '', location: 'Sydney', vertical: '', email: '' });
        await fetchProspects();
      }
    } catch { /* ignore */ }
    setAdding(false);
  };

  const handleContact = async (prospect: OutboundProspect) => {
    setContactingId(prospect.id);
    try {
      const res = await fetch(`${RAILWAY_API}/api/analytics/prospects/${userId}/${prospect.id}/contact`, {
        method: 'POST',
        headers: { 'x-api-key': RAILWAY_API_KEY },
      });
      const data = await res.json();
      if (data.ok) {
        setOutreachSentId(prospect.id);
        setProspects(prev => prev.map(p => p.id === prospect.id ? { ...p, outreachStatus: 'contacted' } : p));
        setTimeout(() => setOutreachSentId(null), 3000);
      }
    } catch { /* ignore */ }
    setContactingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{prospects.length} prospects in outbound queue</p>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-xl text-xs font-bold hover:bg-[#D4AF37]/20 transition-colors"
        >
          + Add prospect
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-14">
          <div role="status" aria-label="Loading" className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : prospects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-white font-bold text-sm mb-1">No outbound prospects yet</p>
          <p className="text-gray-600 text-xs max-w-[260px]">Add Australian SMBs to research, enrich, and contact at scale.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prospects.map(p => {
            const badge = OUTREACH_STATUS_BADGES[p.outreachStatus] ?? OUTREACH_STATUS_BADGES.queued!;
            const isContacting = contactingId === p.id;
            const sentSuccess = outreachSentId === p.id;
            return (
              <div key={p.id} className="flex items-start gap-3 p-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl hover:border-[#D4AF37]/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-xs font-bold text-[#D4AF37] flex-shrink-0">
                  {p.businessName[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p.businessName}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{p.vertical}</span>
                        <span className="text-[10px] text-gray-600">📍 {p.location}</span>
                        {p.email && <span className="text-[10px] text-gray-500 truncate max-w-[160px]">✉️ {p.email}</span>}
                        {p.phone && <span className="text-[10px] text-gray-600">📞 {p.phone}</span>}
                        {p.website && <a href={p.website.startsWith('http') ? p.website : `https://${p.website}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-600 hover:text-white transition truncate max-w-[120px]">🌐 {p.website}</a>}
                      </div>
                      <div className="mt-1.5">
                        <EnrichmentBar score={p.enrichmentScore} />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.style}`}>{badge.label}</span>
                      {sentSuccess ? (
                        <span className="text-[11px] text-green-400 font-semibold">Outreach sent ✉️</span>
                      ) : p.email && p.outreachStatus === 'queued' ? (
                        <button
                          onClick={() => handleContact(p)}
                          disabled={isContacting}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-lg hover:bg-[#D4AF37]/20 transition-colors disabled:opacity-50 font-semibold"
                        >
                          {isContacting ? <span role="status" aria-label="Loading" className="w-3 h-3 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" /> : 'Contact →'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Prospect Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setAddModalOpen(false)}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-sm">Add Prospect</h3>
              <button onClick={() => setAddModalOpen(false)} aria-label="Close" className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Business name *"
                value={form.businessName}
                onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              <input
                type="url"
                placeholder="Website (optional)"
                value={form.website}
                onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              <input
                type="text"
                placeholder="Location (e.g. Mosman, Sydney)"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              <select
                value={form.vertical}
                onChange={e => setForm(f => ({ ...f, vertical: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
              >
                <option value="">Select vertical...</option>
                {TARGET_VERTICALS_LIST.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <input
                type="email"
                placeholder="Email (for outreach)"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAddModalOpen(false)}
                className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-sm font-semibold hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !form.businessName}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {adding ? <span role="status" aria-label="Loading" className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Add & Enrich'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function SalesPage() {
  const router = useRouter();
  const { user, loading, userProfile } = useAuth();
  const [pipelineTab, setPipelineTab] = useState<'pipeline' | 'calllog' | 'outbound'>('pipeline');
  const [callLogKey, setCallLogKey] = useState(0);

  const [stats, setStats] = useState<SalesStats>({
    totalLeadsThisMonth: 0,
    activeCampaigns: 0,
    callsMadeThisWeek: 0,
    meetingsBooked: 0,
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    async function fetchLeads() {
      try {
        const idToken = await user?.getIdToken().catch(() => '') ?? '';
        const headers: Record<string, string> = { 'x-api-key': RAILWAY_API_KEY };
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
        const res = await fetch(`${RAILWAY_API}/api/leads`, {
          headers,
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Non-OK response');
        const data = await res.json();
        const leadsArr: Lead[] = Array.isArray(data) ? data : data?.leads ?? [];
        setLeads(leadsArr);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const thisMonth = leadsArr.filter(l => l.created_at && new Date(l.created_at) >= startOfMonth);
        const callsThisWeek = leadsArr.filter(l => l.call_made && l.created_at && new Date(l.created_at) >= startOfWeek);
        const meetings = leadsArr.filter(l => l.meeting_booked);
        const campaignIds = new Set(leadsArr.map(l => l.campaign_id).filter(Boolean));

        setStats({
          totalLeadsThisMonth: thisMonth.length,
          activeCampaigns: campaignIds.size,
          callsMadeThisWeek: callsThisWeek.length,
          meetingsBooked: meetings.length,
        });
      } catch {
        setStats({ totalLeadsThisMonth: 0, activeCampaigns: 0, callsMadeThisWeek: 0, meetingsBooked: 0 });
        setLeads([]);
      } finally {
        setStatsLoading(false);
      }
    }

    fetchLeads();
  }, [user]);

  const handleCallsLaunched = useCallback(() => {
    setPipelineTab('calllog');
    setCallLogKey(k => k + 1);
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div role="status" aria-label="Loading" className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const businessName = userProfile?.businessName || '';

  return (
    <DashboardLayout>
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
        <div>
          <Breadcrumb module="Sales" />
          <div className="flex items-center gap-2">
            <span className="text-xl">📞</span>
            <h1 className="text-xl font-black text-white">Sales</h1>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">AI-powered outbound sales via Sophie AI</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-green-500/20 bg-green-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-semibold">Sophie AI live</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">

        <LeadUploadSection
          userId={user.uid}
          businessName={businessName}
          plan={(userProfile as { plan?: string } | null)?.plan || 'starter'}
          userEmail={user.email || ''}
          onCallsLaunched={handleCallsLaunched}
        />

        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
            Live stats
            {statsLoading && (
              <span role="status" aria-label="Loading" className="ml-2 inline-block w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin align-middle" />
            )}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Leads this month" value={stats.totalLeadsThisMonth} icon="🎯" sublabel="from AKAI" />
            <StatCard label="Active campaigns" value={stats.activeCampaigns} icon="🚀" sublabel="running now" />
            <StatCard label="Calls this week" value={stats.callsMadeThisWeek} icon="📞" sublabel="by Sophie AI" />
            <StatCard label="Meetings booked" value={stats.meetingsBooked} icon="📅" sublabel="total pipeline" />
          </div>
        </section>

        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickAction icon="🚀" label="Launch Campaign" description="Start a new outbound sales campaign" href="#lead-upload" chatPrompt="I want to launch a new outbound sales campaign" />
            <QuickAction icon="👥" label="View All Leads" description="See your full lead pipeline and status" href="#leads" chatPrompt="Show me my lead pipeline" />
            <QuickAction icon="🤖" label="Configure Sophie AI" description="Tune your AI sales agent's voice & script" href="/voice" chatPrompt="I want to configure my Sophie AI sales agent" />
          </div>
        </section>

        {/* Pipeline + Call Log + Outbound tabs */}
        <section id="leads">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPipelineTab('pipeline')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${pipelineTab === 'pipeline' ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30' : 'text-gray-500 hover:text-white border border-transparent'}`}
              >
                Pipeline
              </button>
              <button
                onClick={() => setPipelineTab('calllog')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${pipelineTab === 'calllog' ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30' : 'text-gray-500 hover:text-white border border-transparent'}`}
              >
                📋 Call Log
              </button>
              <button
                onClick={() => setPipelineTab('outbound')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${pipelineTab === 'outbound' ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30' : 'text-gray-500 hover:text-white border border-transparent'}`}
              >
                🎯 Prospects
              </button>
            </div>
            {pipelineTab === 'pipeline' && (
              <span className="text-xs text-gray-600">{leads.length} total lead{leads.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 min-h-[160px]">
            {pipelineTab === 'pipeline' ? (
              statsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div role="status" aria-label="Loading" className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <PipelineBoard
                  leads={leads}
                  onStatusChange={(leadId, status, meetingBooked) => {
                    setLeads(prev => prev.map(l =>
                      l.id === leadId
                        ? { ...l, status, meeting_booked: meetingBooked ?? l.meeting_booked, call_made: (status === 'contacted' || status === 'called' || status === 'qualified' || meetingBooked) ? true : l.call_made }
                        : l
                    ));
                    fetch(`${RAILWAY_API}/api/leads/${leadId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
                      body: JSON.stringify({ status, meeting_booked: meetingBooked }),
                    }).catch(() => {});
                  }}
                />
              )
            ) : pipelineTab === 'calllog' ? (
              <CallLogTab key={callLogKey} />
            ) : (
              <OutboundProspectsTab userId={user.uid} />
            )}
          </div>
        </section>

        {/* Follow-up Sequences */}
        <FollowUpSequences leads={leads} />

        {/* AKAI Prospects */}
        <ProspectsSection />

        {/* CTA Banner */}
        <CTASection />

      </div>
    </DashboardLayout>
  );
}
