'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

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
    ? (e: React.MouseEvent) => { e.preventDefault(); sendMessage(chatPrompt); }
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

// ── Activity Feed ─────────────────────────────────────────────────────────
// Must be rendered inside DashboardLayout so useDashboardChat() works.

function ActivityFeed({ leads }: { leads: Lead[] }) {
  const { sendMessage } = useDashboardChat();

  if (!leads || leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4 text-2xl">
          📭
        </div>
        <p className="text-white/60 font-semibold text-sm">No calls made yet.</p>
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
            onClick={() => sendMessage('I want to launch a new outbound sales campaign')}
            className="px-4 py-2 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-xl text-sm font-semibold hover:bg-[#D4AF37]/20 transition-colors"
          >
            Ask AK to launch campaign →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leads.slice(0, 10).map((lead, i) => (
        <div
          key={lead.id ?? i}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-sm flex-shrink-0">
            {lead.meeting_booked ? '📅' : lead.call_made ? '📞' : '🎯'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/70 truncate">
              {lead.meeting_booked
                ? 'Meeting booked'
                : lead.call_made
                ? 'Call completed'
                : 'New lead captured'}
            </p>
            {lead.created_at && (
              <p className="text-[11px] text-gray-600 mt-0.5">
                {new Date(lead.created_at).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                lead.status === 'qualified'
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : lead.status === 'contacted'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
              }`}
            >
              {lead.status ?? 'new'}
            </span>
          </div>
        </div>
      ))}
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

// ── Lead Upload Section ───────────────────────────────────────────────────

function LeadUploadSection({ userId, businessName }: { userId: string; businessName: string }) {
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [uploadedLeads, setUploadedLeads] = useState<Lead[]>([]);
  const [campaignName, setCampaignName] = useState('Campaign 1');
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const nameIdx = headers.findIndex(h => h.includes('name'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile'));
    const emailIdx = headers.findIndex(h => h.includes('email'));

    const parsed: Lead[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
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

  const launchCampaign = async () => {
    if (uploadedLeads.length === 0 || launching) return;
    setLaunching(true);
    setLaunchResult(null);

    // Mark all as calling
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
          leads: uploadedLeads.map(l => ({
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
                    {(lead.name || '?')[0].toUpperCase()}
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
          onClick={() => sendMessage('I want to close more deals — help me launch a campaign with Sophie AI')}
          className="relative flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity shadow-lg shadow-[#D4AF37]/20"
        >
          Ask AK →
        </button>
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
        <LeadUploadSection userId={user.uid} businessName={businessName} />

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

        {/* Recent activity */}
        <section id="leads">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Recent activity</h2>
          </div>
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 min-h-[160px]">
            {statsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ActivityFeed leads={leads} />
            )}
          </div>
        </section>

        {/* CTA Banner — uses useDashboardChat() via CTASection component */}
        <CTASection />

      </div>
    </DashboardLayout>
  );
}
