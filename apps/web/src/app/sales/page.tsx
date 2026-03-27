'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isSafeMode } from '@/lib/beta-config';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

function safeSend(fn: (t: string) => void, text: string) { try { fn(text); } catch { /* chat not ready */ } }

const RAILWAY_API = 'https://api-server-production-2a27.up.railway.app';
const RAILWAY_API_KEY = 'aiclozr_api_key_2026_prod';

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

// ── Stat Card ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  sublabel,
}: {
  label: string;
  value: number | string;
  icon: string;
  sublabel: string;
}) {
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

function QuickAction({
  icon,
  label,
  description,
  href,
  chatPrompt,
}: {
  icon: string;
  label: string;
  description: string;
  href: string;
  chatPrompt?: string;
}) {
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

function getLeadColumn(lead: Lead): 'new' | 'called' | 'qualified' | 'booked' {
  if (lead.meeting_booked || lead.status === 'booked') return 'booked';
  if (lead.status === 'qualified') return 'qualified';
  if (lead.call_made || lead.status === 'contacted' || lead.status === 'called') return 'called';
  return 'new';
}

// ── Pipeline Board ────────────────────────────────────────────────────────

interface PipelineBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: string, meetingBooked?: boolean) => void;
}

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (leadId: string, status: string, meetingBooked?: boolean) => void;
}

function LeadCard({ lead, onStatusChange }: LeadCardProps) {
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

      {/* Status update modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-5 w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm">{lead.name || 'Lead'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
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
                  {opt.label}
                  {currentStatus === opt.status && ' ✓'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PipelineBoard({ leads, onStatusChange }: PipelineBoardProps) {
  const { sendMessage } = useDashboardChat();

  const columns = [
    { id: 'new', label: 'New Lead', color: 'border-gray-600/30 text-gray-400', dot: 'bg-gray-400' },
    { id: 'called', label: 'Called', color: 'border-blue-500/30 text-blue-400', dot: 'bg-blue-400' },
    { id: 'qualified', label: 'Qualified', color: 'border-green-500/30 text-green-400', dot: 'bg-green-400' },
    { id: 'booked', label: 'Booked', color: 'border-purple-500/30 text-purple-400', dot: 'bg-purple-400' },
  ];

  if (!leads || leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4 text-2xl">
          📭
        </div>
        <p className="text-white/60 font-semibold text-sm">No leads yet.</p>
        <p className="text-gray-600 text-xs mt-2 max-w-[260px]">
          Add leads above and launch your first campaign to get Sophie calling.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
          <a
            href="#lead-upload"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('lead-upload')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity"
          >
            ↑ Add leads now
          </a>
          <button
            onClick={() => safeSend(sendMessage, 'I want to launch a new outbound sales campaign')}
            className="px-4 py-2 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-xl text-sm font-semibold hover:bg-[#D4AF37]/20 transition-colors"
          >
            Ask AK to launch campaign →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {columns.map(col => {
        const colLeads = leads.filter(l => getLeadColumn(l) === col.id);
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
                {colLeads.map((lead, i) => (
                  <LeadCard key={lead.id ?? i} lead={lead} onStatusChange={onStatusChange} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
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

// ── Plan lead limits ─────────────────────────────────────────────────────────
const PLAN_LEAD_LIMITS: Record<string, number> = {
  starter: 50,
  growth: 150,
  scale: 500,
  trial: 20,
};
const EXTRA_LEAD_PRICE = 3; // $3 per extra lead

// ── Lead Upload Section ───────────────────────────────────────────────────

function LeadUploadSection({ userId, businessName, plan = 'starter', userEmail = '' }: { userId: string; businessName: string; plan?: string; userEmail?: string }) {
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [uploadedLeads, setUploadedLeads] = useState<Lead[]>([]);
  const [campaignName, setCampaignName] = useState('Campaign 1');
  const [launching, setLaunching] = useState(false);
  const [dncResult, setDncResult] = useState<{ safe: string[]; blocked: string[] } | null>(null);
  const [dncChecking, setDncChecking] = useState(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      setUploadedLeads(prev => [...prev, ...parsed]);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const checkDNC = async () => {
    const phones = uploadedLeads.map(l => l.phone).filter(Boolean);
    if (!phones.length) return;
    setDncChecking(true);
    try {
      const res = await fetch(`${RAILWAY_API}/api/dncr/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
        body: JSON.stringify({ numbers: phones }),
      });
      const data = await res.json();
      setDncResult({ safe: data.safe || [], blocked: data.blocked || [] });
    } catch {
      setDncResult(null);
    } finally {
      setDncChecking(false);
    }
  };

  const launchCampaign = async () => {
    if (uploadedLeads.length === 0 || launching) return;

    // Safe mode — simulate campaign without calling anyone
    if (isSafeMode(userEmail)) {
      setLaunching(true);
      await new Promise(r => setTimeout(r, 1500));
      setUploadedLeads(prev => prev.map(l => ({ ...l, callStatus: 'completed' as const })));
      setLaunchResult({ success: true, message: `✅ Safe mode: Campaign simulated for ${uploadedLeads.length} leads. No calls were made (beta testing mode).` });
      setLaunching(false);
      return;
    }
    setLaunching(true);
    setLaunchResult(null);

    // Filter out DNC numbers if check was run
    const safeLeads = dncResult
      ? uploadedLeads.filter(l => l.phone && !dncResult.blocked.includes(l.phone))
      : uploadedLeads;

    if (safeLeads.length === 0) {
      setLaunchResult({ success: false, message: 'All numbers are on the Do Not Call register — no leads to call.' });
      setLaunching(false);
      return;
    }

    // Mark as calling
    setUploadedLeads(prev => prev.map(l => ({ ...l, callStatus: 'calling' as const })));

    const script = `Hi {{name}}, this is Sophie from ${businessName || '[businessName]'}. I'm reaching out because we help businesses like yours generate more leads and close more deals using AI. Do you have 2 minutes to chat?`;

    try {
      const res = await fetch(`${RAILWAY_API}/api/campaign/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': RAILWAY_API_KEY,
        },
        body: JSON.stringify({
          leads: safeLeads.map(l => ({
            name: l.name || '',
            phone: l.phone || '',
            email: l.email || '',
          })),
          script,
          userId,
          campaignName,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setUploadedLeads(prev => prev.map(l => ({ ...l, callStatus: 'completed' as const })));
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

        {/* Mode toggle */}
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

        {/* Manual form */}
        {mode === 'manual' && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addManualLead()}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
            <input
              type="tel"
              placeholder="Phone (+61...)"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addManualLead()}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addManualLead()}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
            <button
              onClick={addManualLead}
              disabled={!form.name && !form.phone}
              className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl text-sm font-semibold hover:border-[#D4AF37]/40 transition-colors disabled:opacity-40"
            >
              + Add Lead
            </button>
          </div>
        )}

        {/* CSV upload */}
        {mode === 'csv' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 px-6 py-4 border-2 border-dashed border-[#2a2a2a] rounded-xl text-sm text-gray-400 hover:border-[#D4AF37]/40 hover:text-white transition-colors w-full justify-center"
            >
              <span className="text-xl">📎</span>
              <span>Click to upload CSV (name, phone, email columns)</span>
            </button>
            <p className="text-xs text-gray-600 mt-2">Expects headers: name, phone/mobile, email — first row is header</p>
          </div>
        )}

        {/* Uploaded leads list */}
        {uploadedLeads.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{uploadedLeads.length} lead{uploadedLeads.length !== 1 ? 's' : ''} queued</p>
              <button
                onClick={() => setUploadedLeads([])}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {uploadedLeads.map((lead, i) => (
                <div key={lead.id ?? i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]">
                  <div className="w-7 h-7 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-xs text-[#D4AF37] font-bold flex-shrink-0">
                    {(lead.name || '?')[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{lead.name || '—'}</p>
                    <p className="text-xs text-gray-500">{lead.phone} {lead.email ? `· ${lead.email}` : ''}</p>
                  </div>
                  <CallStatusBadge status={lead.callStatus} />
                  {lead.callStatus === 'pending' && (
                    <button
                      onClick={() => removeLead(lead.id!)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm ml-1"
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign name + Launch */}
        {uploadedLeads.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-[#1f1f1f]">
            <input
              type="text"
              placeholder="Campaign name"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
            <button
              onClick={launchCampaign}
              disabled={launching || uploadedLeads.length === 0}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-[#D4AF37]/20"
            >
              {launching ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Launching…
                </>
              ) : (
                <>📞 Start Calling ({uploadedLeads.length})</>
              )}
            </button>
          </div>
        )}

        {/* Launch result */}
        {/* Plan limit warning */}
      {uploadedLeads.length > leadLimit && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-sm">
          <p className="text-yellow-300 font-semibold">⚠️ Over plan limit</p>
          <p className="text-yellow-400/80 text-xs mt-1">
            Your <strong>{plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> plan includes <strong>{leadLimit} leads/mo</strong>.
            You've added {uploadedLeads.length} — that's <strong>{excessLeads} extra at ${EXTRA_LEAD_PRICE}/each = ${extraCost}</strong>.
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
// Rendered inside DashboardLayout so useDashboardChat() has access to the real context.

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

interface Prospect { id: number; name: string; email: string; phone: string; website: string; status: string; subject: string; }

const STATUS_STYLES: Record<string, { label: string; style: string }> = {
  not_contacted:  { label: 'Not contacted', style: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  contacted:      { label: 'Contacted',     style: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  replied:        { label: 'Replied',       style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  qualified:      { label: 'Qualified',     style: 'bg-green-500/10 text-green-400 border-green-500/20' },
  closed:         { label: 'Closed',        style: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  not_interested: { label: 'Not interested',style: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function ProspectsSection() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/prospects').then(r => r.json()).then(d => {
      setProspects(d.prospects ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    await fetch('/api/prospects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }).catch(() => {});
    setUpdating(null);
  };

  const filtered = prospects.filter(p => {
    const matchFilter = filter === 'all' || p.status === filter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = { total: prospects.length, not_contacted: prospects.filter(p => p.status === 'not_contacted').length, contacted: prospects.filter(p => p.status === 'contacted').length, qualified: prospects.filter(p => p.status === 'qualified').length };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">AKAI Prospects</h2>
          <p className="text-xs text-gray-600 mt-0.5">{counts.total} prospects · {counts.not_contacted} not contacted · {counts.contacted} contacted · {counts.qualified} qualified</p>
        </div>
      </div>

      {/* Filter + Search */}
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
          <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">No prospects match your filter.</div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {filtered.map(p => {
              const statusInfo = STATUS_STYLES[p.status] ?? STATUS_STYLES['not_contacted'] ?? { label: p.status, style: '' };
              return (
                <div key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#141414] transition-colors group">
                  <div className="w-7 h-7 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-xs font-bold text-[#D4AF37] flex-shrink-0">
                    {p.id}
                  </div>
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
                      <a
                        href={`mailto:${p.email}?subject=${encodeURIComponent(p.subject || `Introduction — AKAI for ${p.name}`)}&body=${encodeURIComponent(`Hi,\n\nI wanted to reach out about AKAI — an AI system that helps ${p.name} capture more leads automatically, even when you're busy or closed.\n\nWould you have 10 minutes this week for a quick call?\n\nBest,\nAaron\nAKAI — getakai.ai`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => updateStatus(p.id, 'contacted')}
                        className="text-xs px-2.5 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-lg hover:bg-[#D4AF37]/20 transition opacity-0 group-hover:opacity-100 font-semibold"
                      >
                        Email →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function SalesPage() {
  const router = useRouter();
  const { user, loading, userProfile } = useAuth();

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
        const res = await fetch(`${RAILWAY_API}/api/leads`, {
          headers: {
            'x-api-key': RAILWAY_API_KEY,
          },
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

        const thisMonth = leadsArr.filter(
          (l) => l.created_at && new Date(l.created_at) >= startOfMonth
        );
        const callsThisWeek = leadsArr.filter(
          (l) => l.call_made && l.created_at && new Date(l.created_at) >= startOfWeek
        );
        const meetings = leadsArr.filter((l) => l.meeting_booked);
        const campaignIds = new Set(leadsArr.map((l) => l.campaign_id).filter(Boolean));

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

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const businessName = userProfile?.businessName || '';

  return (
    <DashboardLayout>
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
        <div>
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

        {/* Lead Upload & Campaign */}
        <LeadUploadSection userId={user.uid} businessName={businessName} plan={(userProfile as { plan?: string } | null)?.plan || 'starter'} userEmail={user.email || ''} />

        {/* Live stats */}
        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
            Live stats
            {statsLoading && (
              <span className="ml-2 inline-block w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin align-middle" />
            )}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Leads this month" value={stats.totalLeadsThisMonth} icon="🎯" sublabel="from AI Clozr" />
            <StatCard label="Active campaigns" value={stats.activeCampaigns} icon="🚀" sublabel="running now" />
            <StatCard label="Calls this week" value={stats.callsMadeThisWeek} icon="📞" sublabel="by Sophie AI" />
            <StatCard label="Meetings booked" value={stats.meetingsBooked} icon="📅" sublabel="total pipeline" />
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickAction
              icon="🚀"
              label="Launch Campaign"
              description="Start a new outbound sales campaign"
              href="#"
              chatPrompt="I want to launch a new outbound sales campaign"
            />
            <QuickAction
              icon="👥"
              label="View All Leads"
              description="See your full lead pipeline and status"
              href="#leads"
              chatPrompt="Show me my lead pipeline"
            />
            <QuickAction
              icon="🤖"
              label="Configure Sophie AI"
              description="Tune your AI sales agent's voice & script"
              href="#"
              chatPrompt="I want to configure my Sophie AI sales agent"
            />
          </div>
        </section>

        {/* CRM Pipeline Board */}
        <section id="leads">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Pipeline</h2>
            <span className="text-xs text-gray-600">{leads.length} total lead{leads.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 min-h-[160px]">
            {statsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
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
                  // Persist to Railway
                  fetch(`${RAILWAY_API}/api/leads/${leadId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
                    body: JSON.stringify({ status, meeting_booked: meetingBooked }),
                  }).catch(() => {});
                }}
              />
            )}
          </div>
        </section>

        {/* AKAI Prospects */}
        <ProspectsSection />

        {/* CTA Banner — uses useDashboardChat() via CTASection component */}
        <CTASection />

      </div>
    </DashboardLayout>
  );
}
