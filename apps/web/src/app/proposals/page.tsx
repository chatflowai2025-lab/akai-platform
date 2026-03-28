'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { isSafeMode } from '@/lib/beta-config';
import { getFirebaseDb } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProspectOption {
  id: number;
  name: string;
  email: string;
  website: string;
  phone?: string;
  industry?: string;
  subject?: string;
}

type ToneOption = 'professional' | 'consultative' | 'direct' | 'friendly';

interface ModuleOption {
  id: string;
  label: string;
  icon: string;
  price: number;
}

interface ProposalSection {
  executiveSummary: string;
  challenges: string[];
  solutions: Array<{ module: string; description: string }>;
  investment: {
    rows: Array<{ module: string; monthly: number }>;
    total: number;
  };
  roiProjection: {
    leadsPerMonth: string;
    avgDealSize: string;
    projectedRevenue: string;
    rationale?: string;
  };
  nextSteps: string[];
}

interface SavedProposal {
  id: string;
  businessName: string;
  modules: string[];
  content: ProposalSection;
  markdown: string;
  createdAt: Timestamp | null;
}

// ── Pipeline Types ─────────────────────────────────────────────────────────────
type ProposalStatus = 'Draft' | 'Sent' | 'Opened' | 'Replied' | 'Won' | 'Lost';
type ProposalsPageTab = 'pipeline' | 'create';

interface PipelineProposal {
  id: string;
  clientName: string;
  service: string;
  amount: number;
  dateSent: string;
  status: ProposalStatus;
  notes: string;
}

const PIPELINE_STATUSES: ProposalStatus[] = ['Draft', 'Sent', 'Opened', 'Replied', 'Won', 'Lost'];

const STATUS_STYLES: Record<ProposalStatus, string> = {
  Draft: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  Sent: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  Opened: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  Replied: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  Won: 'text-green-400 bg-green-500/10 border-green-500/30',
  Lost: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const STATUS_COL_HEADER: Record<ProposalStatus, string> = {
  Draft: 'border-gray-600',
  Sent: 'border-blue-500',
  Opened: 'border-yellow-500',
  Replied: 'border-purple-500',
  Won: 'border-green-500',
  Lost: 'border-red-500',
};

const MOCK_PROPOSALS: PipelineProposal[] = [];

// ── Module config ─────────────────────────────────────────────────────────────
const MODULES: ModuleOption[] = [
  { id: 'sales', label: 'Sales (Sophie AI calling)', icon: '📞', price: 297 },
  { id: 'voice', label: 'Voice (AI outbound)', icon: '🎙️', price: 197 },
  { id: 'web', label: 'Web (Website audit + builder)', icon: '🌐', price: 197 },
  { id: 'social', label: 'Social (Content generation)', icon: '📱', price: 147 },
  { id: 'ads', label: 'Ads (Google + Meta ads)', icon: '📣', price: 397 },
  { id: 'recruit', label: 'Recruit (AI hiring)', icon: '🎯', price: 247 },
];

const TONES: Array<{ id: ToneOption; label: string }> = [
  { id: 'professional', label: 'Professional' },
  { id: 'consultative', label: 'Consultative' },
  { id: 'direct', label: 'Direct' },
  { id: 'friendly', label: 'Friendly' },
];

// ── Vertical detection + HTML email builder (client-side) ────────────────────
function detectVertical(industry: string): string {
  const text = industry.toLowerCase();
  if (text.match(/plumb|electri|trade|builder|construct|hvac|landscap/)) return 'trades';
  if (text.match(/real estate|property|mortgage|finance|broker/)) return 'real_estate';
  if (text.match(/restaurant|cafe|hospitality|food|venue|catering/)) return 'hospitality';
  if (text.match(/recruit|hiring|staffing|hr|talent|candidate/)) return 'recruitment';
  if (text.match(/kitchen|interior|design|fitout|renovati/)) return 'interiors';
  if (text.match(/yacht|charter|boat|vessel|marine/)) return 'marine';
  return 'professional';
}

function getCTACopy(vertical: string): string {
  switch (vertical) {
    case 'trades': return 'Book a free site visit →';
    case 'real_estate': return 'Schedule a free consultation →';
    case 'hospitality': return 'Reserve your tasting →';
    case 'recruitment': return 'Talk to our team →';
    case 'interiors': return 'Book a free design consultation →';
    case 'marine': return 'Schedule a viewing →';
    default: return 'Book a free call →';
  }
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildProposalEmailHtml(opts: {
  businessName: string;
  industry: string;
  markdown: string;
  website?: string;
}): string {
  const vertical = detectVertical(opts.industry);
  const ctaCopy = getCTACopy(vertical);
  const site = opts.website ? opts.website.replace(/^https?:\/\//, '') : '';
  const ctaUrl = site ? `https://${site}` : 'https://getakai.ai';
  const initial = (opts.businessName || 'A').charAt(0).toUpperCase();

  const bodyHtml = opts.markdown
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p style="margin:0 0 16px 0;color:#333;font-size:16px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${escHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${escHtml(opts.businessName)}</title></head>
<body style="margin:0;padding:0;background-color:#f0f0f0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f0f0;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.10);">
<tr><td style="background-color:#1a1a1a;padding:40px;text-align:center;">
<div style="width:68px;height:68px;background-color:#D4AF37;border-radius:50%;margin:0 auto 18px;text-align:center;line-height:68px;font-size:30px;font-weight:900;color:#000;font-family:Arial,sans-serif;">${initial}</div>
<h1 style="margin:0 0 8px;color:#fff;font-size:26px;font-weight:700;font-family:Arial,sans-serif;">${escHtml(opts.businessName)}</h1>
${opts.industry ? `<p style="margin:0;color:#D4AF37;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif;">${escHtml(opts.industry)}</p>` : ''}
</td></tr>
<tr><td style="padding:40px 40px 8px;background:#fff;">${bodyHtml}</td></tr>
<tr><td style="padding:8px 40px 40px;background:#fff;text-align:center;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
<tr><td style="background-color:#D4AF37;border-radius:8px;">
<a href="${ctaUrl}" style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:700;color:#000;text-decoration:none;border-radius:8px;font-family:Arial,sans-serif;">${escHtml(ctaCopy)}</a>
</td></tr></table></td></tr>
<tr><td style="padding:0 40px;"><div style="border-top:1px solid #eee;height:1px;font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td style="background:#f5f5f5;padding:24px 40px;text-align:center;border-radius:0 0 10px 10px;">
<p style="margin:0 0 10px;color:#666;font-size:13px;font-family:Arial,sans-serif;">AKAI &nbsp;&middot;&nbsp; <a href="https://getakai.ai" style="color:#888;text-decoration:none;">getakai.ai</a></p>
<p style="margin:0;font-size:11px;color:#aaa;font-family:Arial,sans-serif;">You received this proposal from AKAI. <a href="mailto:support@getakai.ai?subject=Unsubscribe" style="color:#aaa;text-decoration:underline;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#1a1a1a] border border-[#D4AF37]/30 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-3">
      <span>✅</span>
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss" className="text-gray-500 hover:text-white ml-2">✕</button>
    </div>
  );
}

// ── Pipeline Tab ──────────────────────────────────────────────────────────────
function PipelineTab() {
  const [proposals, setProposals] = useState<PipelineProposal[]>(() => {
    if (typeof window === 'undefined') return MOCK_PROPOSALS;
    try {
      const stored = localStorage.getItem('akai_proposals');
      return stored ? (JSON.parse(stored) as PipelineProposal[]) : MOCK_PROPOSALS;
    } catch { return MOCK_PROPOSALS; }
  });

  const [showCreate, setShowCreate] = useState(false);
  const [newClient, setNewClient] = useState('');
  const [newService, setNewService] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [viewProposal, setViewProposal] = useState<PipelineProposal | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    localStorage.setItem('akai_proposals', JSON.stringify(proposals));
  }, [proposals]);

  const wonCount = proposals.filter(p => p.status === 'Won').length;
  const sentCount = proposals.filter(p => p.status !== 'Draft').length;
  const totalCount = proposals.length;
  const winRate = sentCount > 0 ? ((wonCount / sentCount) * 100).toFixed(1) : '0.0';
  const isEmpty = proposals.length === 0;

  const addProposal = () => {
    if (!newClient.trim()) return;
    const newP: PipelineProposal = {
      id: Date.now().toString(),
      clientName: newClient.trim(),
      service: newService.trim() || 'AKAI Package',
      amount: parseFloat(newAmount) || 0,
      dateSent: '',
      status: 'Draft',
      notes: newNotes.trim(),
    };
    setProposals(prev => [newP, ...prev]);
    setNewClient(''); setNewService(''); setNewAmount(''); setNewNotes('');
    setShowCreate(false);
  };

  const generateWithAI = async () => {
    if (!newClient.trim()) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1200));
    setNewService(prev => prev || 'Sales AI + Web Audit');
    setNewAmount(prev => prev || '997');
    setNewNotes(prev => prev || `AI-generated package tailored for ${newClient.trim()}. Includes onboarding + 30-day review.`);
    setGenerating(false);
  };

  const updateStatus = (id: string, status: ProposalStatus) => {
    setProposals(prev => prev.map(p =>
      p.id === id
        ? { ...p, status, dateSent: status === 'Sent' && !p.dateSent ? (new Date().toISOString().split('T')[0] ?? '') : p.dateSent }
        : p
    ));
  };

  const deleteProposal = (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
    if (viewProposal?.id === id) setViewProposal(null);
  };

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-6 px-6 py-3 border-b border-[#1f1f1f] bg-[#0a0a0a] flex-shrink-0">
        <div className="flex items-center gap-4 text-sm flex-1">
          <span className="text-gray-500">Total: <span className="text-white font-bold">{totalCount}</span></span>
          <span className="text-gray-700">|</span>
          <span className="text-gray-500">Sent: <span className="text-white font-bold">{sentCount}</span></span>
          <span className="text-gray-700">|</span>
          <span className="text-gray-500">Won: <span className="text-green-400 font-bold">{wonCount}</span></span>
          <span className="text-gray-700">|</span>
          <span className="text-gray-500">Win rate: <span className="text-[#D4AF37] font-bold">{winRate}%</span></span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-1.5 bg-[#D4AF37] text-black rounded-lg text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5"
        >
          + New Proposal
        </button>
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center border-b border-[#1f1f1f] bg-[#080808]">
          <p className="text-5xl mb-4">📄</p>
          <p className="text-white font-black text-lg mb-2">No proposals yet</p>
          <p className="text-gray-500 text-sm mb-6 max-w-[300px]">Create your first proposal and start winning clients. Each deal starts with a great pitch.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition shadow-lg shadow-[#D4AF37]/20"
          >
            ✨ Create first proposal →
          </button>
        </div>
      )}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-0 min-w-max">
          {PIPELINE_STATUSES.map(status => {
            const cols = proposals.filter(p => p.status === status);
            return (
              <div key={status} className="w-56 flex-shrink-0 border-r border-[#1a1a1a] flex flex-col">
                <div className={`px-4 py-3 border-b-2 ${STATUS_COL_HEADER[status]} bg-[#080808] flex-shrink-0`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{status}</span>
                    <span className="text-xs text-gray-600 font-semibold">{cols.length}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#050505]">
                  {cols.map(p => (
                    <div
                      key={p.id}
                      className="bg-[#111] border border-[#1f1f1f] rounded-xl p-3 hover:border-[#2a2a2a] transition group cursor-pointer"
                      onClick={() => setViewProposal(p)}
                    >
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <p className="text-xs font-bold text-white leading-tight">{p.clientName}</p>
                        <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${STATUS_STYLES[p.status]}`}>
                          {p.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-2 truncate">{p.service}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[#D4AF37] text-xs font-bold">{fmt(p.amount)}<span className="text-gray-600">/mo</span></span>
                        {p.dateSent && <span className="text-[10px] text-gray-700">{p.dateSent.slice(5)}</span>}
                      </div>
                      {p.notes && <p className="text-[10px] text-gray-700 mt-2 leading-relaxed line-clamp-2">{p.notes}</p>}
                      <button
                        className="mt-3 w-full text-center text-[10px] text-gray-600 hover:text-[#D4AF37] transition py-1 border border-[#1f1f1f] hover:border-[#D4AF37]/30 rounded-lg"
                        onClick={e => { e.stopPropagation(); setViewProposal(p); }}
                      >
                        View →
                      </button>
                    </div>
                  ))}
                  {cols.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-20 gap-1 border border-dashed border-[#1f1f1f] rounded-xl">
                      <p className="text-[11px] text-gray-600">No proposals</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm">New Proposal</h3>
              <button onClick={() => setShowCreate(false)} aria-label="Close" className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Client Name *', value: newClient, onChange: setNewClient, placeholder: 'e.g. Smith & Sons Plumbing' },
                { label: 'Service', value: newService, onChange: setNewService, placeholder: 'e.g. Sales AI + Web Audit' },
                { label: 'Amount ($/mo)', value: newAmount, onChange: setNewAmount, placeholder: 'e.g. 997', type: 'number' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[11px] text-gray-600 block mb-1">{f.label}</label>
                  <input value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder} type={f.type}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#D4AF37]/50" />
                </div>
              ))}
              <div>
                <label className="text-[11px] text-gray-600 block mb-1">Notes</label>
                <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="e.g. Met at BNI, warm lead..." rows={3}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#D4AF37]/50 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={generateWithAI} disabled={generating || !newClient.trim()}
                className="flex-1 py-2 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg text-xs font-semibold hover:bg-[#D4AF37]/10 disabled:opacity-40 transition flex items-center justify-center gap-1.5">
                {generating ? <><span role="status" aria-label="Loading" className="w-3 h-3 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" /> Generating...</> : '✨ Generate with AI'}
              </button>
              <button onClick={addProposal} disabled={!newClient.trim()}
                className="flex-1 py-2 bg-[#D4AF37] text-black rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-40 transition">
                Add to Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      {viewProposal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm">{viewProposal.clientName}</h3>
              <button onClick={() => setViewProposal(null)} aria-label="Close" className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-3 mb-4">
              {[
                { label: 'Service', value: viewProposal.service },
                { label: 'Amount', value: `$${viewProposal.amount}/mo`, highlight: true },
                { label: 'Date Sent', value: viewProposal.dateSent || '—' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{row.label}</span>
                  <span className={`text-xs ${row.highlight ? 'text-[#D4AF37] font-bold' : 'text-white'}`}>{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${STATUS_STYLES[viewProposal.status]}`}>{viewProposal.status}</span>
              </div>
              {viewProposal.notes && <div><p className="text-gray-500 text-xs mb-1">Notes</p><p className="text-gray-300 text-xs leading-relaxed">{viewProposal.notes}</p></div>}
            </div>
            <div>
              <p className="text-[11px] text-gray-600 mb-2">Move to:</p>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_STATUSES.filter(s => s !== viewProposal.status).map(s => (
                  <button key={s} onClick={() => { updateStatus(viewProposal.id, s); setViewProposal({ ...viewProposal, status: s }); }}
                    className={`text-[10px] px-2 py-1 rounded-lg border font-semibold ${STATUS_STYLES[s]} hover:opacity-80 transition`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => { deleteProposal(viewProposal.id); setViewProposal(null); }}
              className="mt-4 w-full py-1.5 text-xs text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Proposal preview renderer ─────────────────────────────────────────────────
function ProposalPreview({
  proposal,
  markdown,
  businessName,
  industry,
  contactName,
  website,
  onEmail,
  onCopy,
  onDownloadPdf,
}: {
  proposal: ProposalSection;
  markdown: string;
  businessName: string;
  industry: string;
  contactName: string;
  website?: string;
  onEmail: () => void;
  onCopy: () => void;
  onDownloadPdf: () => void;
}) {
  const [viewMode, setViewMode] = useState<'document' | 'email'>('document');
  const date = (() => { try { return new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return new Date().toISOString().split('T')[0]; } })();

  const htmlEmail = buildProposalEmailHtml({ businessName, industry, markdown, website });

  return (
    <div className="flex flex-col h-full">
      {/* Action bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[#1f1f1f] bg-[#080808] flex-shrink-0">
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-[#111] rounded-lg p-1 mr-2">
          <button
            onClick={() => setViewMode('document')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition ${viewMode === 'document' ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}
          >
            Document
          </button>
          <button
            onClick={() => setViewMode('email')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition ${viewMode === 'email' ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}
          >
            Email Preview
          </button>
        </div>
        <button
          onClick={onEmail}
          className="px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg text-xs font-semibold hover:bg-[#D4AF37]/20 transition flex items-center gap-1.5"
        >
          ✉️ Email Proposal
        </button>
        <button
          onClick={onCopy}
          className="px-3 py-1.5 border border-[#2a2a2a] text-gray-400 rounded-lg text-xs font-semibold hover:text-white hover:border-[#3a3a3a] transition flex items-center gap-1.5"
        >
          📋 Copy to clipboard
        </button>
        <button
          onClick={onDownloadPdf}
          className="px-3 py-1.5 border border-[#2a2a2a] text-gray-400 rounded-lg text-xs font-semibold hover:text-white hover:border-[#3a3a3a] transition flex items-center gap-1.5"
        >
          ⬇️ Download PDF
        </button>
      </div>

      {/* Email preview mode */}
      {viewMode === 'email' && (
        <div className="flex-1 overflow-hidden bg-[#1a1a1a] p-6">
          <iframe
            srcDoc={htmlEmail}
            title="Email preview"
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '10px' }}
            sandbox="allow-same-origin"
          />
        </div>
      )}

      {/* Proposal document */}
      {viewMode === 'document' && (<div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center border-b border-[#2a2a2a] pb-8">
            <div className="text-4xl font-black mb-1">
              AK<span className="text-[#D4AF37]">AI</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-6 uppercase tracking-wide">
              PROPOSAL FOR {businessName.toUpperCase()}
            </h1>
            <p suppressHydrationWarning className="text-sm text-gray-400 mt-2">Prepared by AKAI — {date}</p>
            {contactName && <p className="text-sm text-gray-500 mt-1">Attention: {contactName}</p>}
          </div>

          {/* Executive Summary */}
          <section>
            <h2 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-3">Executive Summary</h2>
            <p className="text-gray-300 text-sm leading-relaxed">{proposal.executiveSummary}</p>
          </section>

          <div className="border-t border-[#1f1f1f]" />

          {/* The Challenge */}
          <section>
            <h2 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-3">The Challenge</h2>
            <ul className="space-y-2">
              {proposal.challenges.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-[#D4AF37] mt-0.5 flex-shrink-0">→</span>
                  {c}
                </li>
              ))}
            </ul>
          </section>

          <div className="border-t border-[#1f1f1f]" />

          {/* Our Solution */}
          <section>
            <h2 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-4">Our Solution</h2>
            <div className="space-y-5">
              {proposal.solutions.map((s, i) => (
                <div key={i} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white mb-1.5">{s.module}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="border-t border-[#1f1f1f]" />

          {/* The Investment */}
          <section>
            <h2 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-3">The Investment</h2>
            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1f1f1f]">
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wider">Skill</th>
                    <th className="text-right px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wider">Monthly</th>
                    <th className="text-right px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wider">Setup</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.investment.rows.map((r, i) => (
                    <tr key={i} className="border-b border-[#111] last:border-b-0">
                      <td className="px-4 py-2.5 text-gray-300 text-xs">{r.module}</td>
                      <td className="px-4 py-2.5 text-right text-gray-300 text-xs">${r.monthly}/mo</td>
                      <td className="px-4 py-2.5 text-right text-gray-500 text-xs">Included</td>
                    </tr>
                  ))}
                  <tr className="bg-[#D4AF37]/5 border-t border-[#D4AF37]/20">
                    <td className="px-4 py-3 text-sm font-bold text-[#D4AF37]">TOTAL</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#D4AF37]">${proposal.investment.total}/mo</td>
                    <td className="px-4 py-3 text-right text-xs text-green-400 font-semibold">$0 setup fee</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div className="border-t border-[#1f1f1f]" />

          {/* ROI Projection */}
          <section>
            <h2 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-3">ROI Projection</h2>
            {proposal.roiProjection.rationale && (
              <p className="text-sm text-gray-300 leading-relaxed mb-3">{proposal.roiProjection.rationale}</p>
            )}
            <div className="bg-[#111] border border-[#D4AF37]/20 rounded-xl p-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                At an average deal size of{' '}
                <span className="text-[#D4AF37] font-semibold">{proposal.roiProjection.avgDealSize}</span>,
                capturing just {proposal.roiProjection.leadsPerMonth} extra leads per month ={' '}
                <span className="text-white font-bold">{proposal.roiProjection.projectedRevenue}</span> in additional revenue.
              </p>
            </div>
          </section>

          <div className="border-t border-[#1f1f1f]" />

          {/* Next Steps */}
          <section>
            <h2 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-3">Next Steps</h2>
            <ol className="space-y-2">
              {proposal.nextSteps.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                  <span className="w-5 h-5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </section>

          {/* Footer */}
          <div className="border-t border-[#1f1f1f] pt-6 text-center">
            <p className="text-xs text-gray-600">AKAI — getakai.ai | hello@getakai.ai</p>
          </div>
        </div>
      </div>)}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProposalsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ProposalsPageTab>('pipeline');
  // Suppresses unused-vars warning
  const _ref = useRef(false); void _ref;

  // Left panel form state
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set(['sales', 'web']));
  const [tone, setTone] = useState<ToneOption>('consultative');

  // Prospect picker
  const [showProspectPicker, setShowProspectPicker] = useState(false);
  const [prospects, setProspects] = useState<ProspectOption[]>([]);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [prospectSearch, setProspectSearch] = useState('');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedProposal, setGeneratedProposal] = useState<ProposalSection | null>(null);
  const [generatedMarkdown, setGeneratedMarkdown] = useState('');
  const [generateError, setGenerateError] = useState('');

  // Saved proposals
  const [savedProposals, setSavedProposals] = useState<SavedProposal[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Toast
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Load saved proposals on mount
  useEffect(() => {
    if (!user) return;
    loadSavedProposals();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSavedProposals = async () => {
    if (!user) return;
    setLoadingSaved(true);
    try {
      const db = getFirebaseDb();
      if (!db) return;
      const q = query(
        collection(db, `users/${user.uid}/proposals`),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<SavedProposal, 'id'>),
      }));
      setSavedProposals(docs);
    } catch {
      // Firestore not available
    } finally {
      setLoadingSaved(false);
    }
  };

  const loadProspects = async () => {
    if (prospects.length > 0) {
      setShowProspectPicker(true);
      return;
    }
    setLoadingProspects(true);
    try {
      const res = await fetch('/api/prospects');
      const data = await res.json();
      setProspects((data.prospects ?? []).slice(0, 20));
    } catch {
      setProspects([]);
    } finally {
      setLoadingProspects(false);
      setShowProspectPicker(true);
    }
  };

  const pickProspect = (p: ProspectOption) => {
    setBusinessName(p.name);
    setWebsite(p.website || '');
    setContactEmail(p.email || '');
    if (p.industry) setIndustry(p.industry);
    if (p.name && !contactName) setContactName(p.name);
    setShowProspectPicker(false);
    setProspectSearch('');
  };

  const toggleModule = (id: string) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPrice = Array.from(selectedModules).reduce((sum, id) => {
    const m = MODULES.find(m => m.id === id);
    return sum + (m?.price ?? 0);
  }, 0);

  const handleGenerate = async () => {
    if (!businessName.trim() || !industry.trim() || selectedModules.size === 0) return;
    setGenerating(true);
    setGenerateError('');
    try {
      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          contactName: contactName.trim() || undefined,
          industry: industry.trim(),
          location: location.trim() || undefined,
          website: website.trim() || undefined,
          modules: Array.from(selectedModules),
          tone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setGeneratedProposal(data.proposal);
      setGeneratedMarkdown(data.markdown);

      // Save to Firestore
      await saveProposal(data.proposal, data.markdown);
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const saveProposal = async (content: ProposalSection, markdown: string) => {
    if (!user) return;
    try {
      const db = getFirebaseDb();
      if (!db) return;
      await addDoc(collection(db, `users/${user.uid}/proposals`), {
        businessName: businessName.trim(),
        modules: Array.from(selectedModules),
        content,
        markdown,
        createdAt: serverTimestamp(),
      });
      await loadSavedProposals();
    } catch {
      // silently fail
    }
  };

  const handleEmail = useCallback(async () => {
    if (!generatedMarkdown) return;

    // Safe mode — simulate send without emailing anyone
    if (isSafeMode(user?.email ?? '')) {
      setToast('Safe mode: Email simulated — no message sent (beta testing mode).');
      return;
    }

    const subjectLine = `AKAI Proposal for ${businessName}`;
    const htmlVersion = buildProposalEmailHtml({ businessName, industry, markdown: generatedMarkdown, website });

    const subjectEnc = encodeURIComponent(subjectLine);
    const bodyEnc = encodeURIComponent(generatedMarkdown);
    const to = encodeURIComponent(contactEmail || '');

    // Try Railway API first
    try {
      const res = await fetch('https://api-server-production-2a27.up.railway.app/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'aiclozr_api_key_2026_prod',
        },
        body: JSON.stringify({
          to: contactEmail || '',
          subject: subjectLine,
          body: generatedMarkdown,
          htmlBody: htmlVersion,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        setToast('Proposal emailed successfully!');
        return;
      }
      // 404 or error — fall through to mailto
    } catch {
      // fall through to mailto
    }

    // Fallback: mailto
    window.location.href = `mailto:${to}?subject=${subjectEnc}&body=${bodyEnc}`;
  }, [generatedMarkdown, businessName, industry, website, contactEmail, user?.email]);

  const handleCopy = useCallback(async () => {
    if (!generatedMarkdown) return;
    try {
      await navigator.clipboard.writeText(generatedMarkdown);
      setToast('Proposal copied to clipboard!');
    } catch {
      setToast('Could not copy — try selecting and copying manually.');
    }
  }, [generatedMarkdown]);

  const handleDownloadPdf = useCallback(() => {
    setToast('PDF download coming soon');
  }, []);

  const loadSavedProposalContent = (saved: SavedProposal) => {
    setBusinessName(saved.businessName);
    setSelectedModules(new Set(saved.modules));
    setGeneratedProposal(saved.content);
    setGeneratedMarkdown(saved.markdown || '');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div role="status" aria-label="Loading" className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808] flex-shrink-0">
          <div>
            <h1 className="text-xl font-black text-white">Proposals</h1>
            <p className="text-xs text-gray-500 mt-0.5">Track and generate AI-powered proposals</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#111] rounded-lg p-1">
              <button onClick={() => setActiveTab('pipeline')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'pipeline' ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}>
                📊 Pipeline
              </button>
              <button onClick={() => setActiveTab('create')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'create' ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}>
                ✨ Create
              </button>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] font-medium">Live</span>
          </div>
        </header>

        {/* Pipeline Tab */}
        {activeTab === 'pipeline' && <PipelineTab />}

        {/* Create Tab — two-panel layout */}
        {activeTab === 'create' && <div className="flex flex-1 overflow-hidden">

          {/* ── Left panel ──────────────────────────────────────────────── */}
          <aside className="w-[300px] flex-shrink-0 border-r border-[#1f1f1f] bg-[#080808] overflow-y-auto flex flex-col">
            <div className="p-4 space-y-5 flex-1">

              {/* Section 1 — Prospect */}
              <section>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Prospect</h2>

                <button
                  onClick={loadProspects}
                  className="w-full mb-3 py-2 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg text-xs font-semibold hover:bg-[#D4AF37]/10 transition flex items-center justify-center gap-1.5"
                >
                  {loadingProspects ? (
                    <span role="status" aria-label="Loading" className="w-3 h-3 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                  ) : '👤'} Pick from prospects
                </button>

                <div className="space-y-2">
                  {[
                    { label: 'Business Name *', value: businessName, onChange: setBusinessName, placeholder: 'e.g. Network Plumbing' },
                    { label: 'Contact Name', value: contactName, onChange: setContactName, placeholder: 'e.g. Jane Smith' },
                    { label: 'Contact Email', value: contactEmail, onChange: setContactEmail, placeholder: 'jane@business.com' },
                    { label: 'Industry *', value: industry, onChange: setIndustry, placeholder: 'e.g. Plumbing, Real Estate' },
                    { label: 'Location', value: location, onChange: setLocation, placeholder: 'e.g. Sydney, NSW' },
                    { label: 'Website', value: website, onChange: setWebsite, placeholder: 'e.g. getakai.ai' },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="text-[11px] text-gray-600 block mb-1">{f.label}</label>
                      <input
                        value={f.value}
                        onChange={e => f.onChange(e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#D4AF37]/50 transition"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 2 — Skills */}
              <section>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">What are you pitching?</h2>
                <div className="space-y-1.5">
                  {MODULES.map(m => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedModules.has(m.id)}
                        onChange={() => toggleModule(m.id)}
                        className="w-3.5 h-3.5 accent-[#D4AF37] flex-shrink-0"
                      />
                      <span className="text-xs text-gray-400 group-hover:text-gray-200 transition flex-1">
                        {m.icon} {m.label}
                      </span>
                      <span className="text-[11px] text-gray-600 flex-shrink-0">${m.price}/mo</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#1f1f1f] flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total</span>
                  <span className="text-sm font-bold text-[#D4AF37]">${totalPrice}/mo</span>
                </div>
              </section>

              {/* Section 3 — Tone */}
              <section>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Tone</h2>
                <div className="grid grid-cols-2 gap-1.5">
                  {TONES.map(t => (
                    <label
                      key={t.id}
                      className={`flex items-center justify-center px-2 py-1.5 rounded-lg border text-xs cursor-pointer transition ${
                        tone === t.id
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                          : 'border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tone"
                        value={t.id}
                        checked={tone === t.id}
                        onChange={() => setTone(t.id)}
                        className="hidden"
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </section>

              {/* Section 4 — Actions */}
              <section>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !businessName.trim() || !industry.trim() || selectedModules.size === 0}
                  className="w-full py-2.5 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <span role="status" aria-label="Loading" className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : 'Generate Proposal →'}
                </button>
                {generateError && (
                  <p className="text-xs text-red-400 mt-2">{generateError}</p>
                )}
                {!businessName.trim() && !industry.trim() && (
                  <p className="text-[11px] text-gray-700 mt-1.5">Enter business name and industry to generate</p>
                )}
              </section>

              {/* Recent proposals */}
              {savedProposals.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Recent Proposals</h2>
                  {loadingSaved ? (
                    <p className="text-xs text-gray-500">Loading saved proposals…</p>
                  ) : (
                    <div className="space-y-1">
                      {savedProposals.map(p => (
                        <button
                          key={p.id}
                          onClick={() => loadSavedProposalContent(p)}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#111] transition group"
                        >
                          <p className="text-xs text-gray-300 group-hover:text-white transition truncate">{p.businessName}</p>
                          <p className="text-[11px] text-gray-600">{p.modules.length} skill{p.modules.length !== 1 ? 's' : ''}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </aside>

          {/* ── Right panel ─────────────────────────────────────────────── */}
          <main className="flex-1 overflow-hidden bg-[#0a0a0a]">
            {generatedProposal ? (
              <ProposalPreview
                proposal={generatedProposal}
                markdown={generatedMarkdown}
                businessName={businessName}
                industry={industry}
                contactName={contactName}
                website={website}
                onEmail={handleEmail}
                onCopy={handleCopy}
                onDownloadPdf={handleDownloadPdf}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-8">
                  <div className="text-6xl mb-4">📄</div>
                  <h2 className="text-white font-bold text-lg mb-2">
                    Fill in the details and hit Generate →
                  </h2>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto">
                    AKAI writes a personalised proposal based on the prospect&apos;s industry, your selected skills, and the tone you pick.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 justify-center text-xs text-gray-600">
                    <span className="px-2 py-1 bg-[#111] rounded-full border border-[#1f1f1f]">AI-generated content</span>
                    <span className="px-2 py-1 bg-[#111] rounded-full border border-[#1f1f1f]">Industry-specific</span>
                    <span className="px-2 py-1 bg-[#111] rounded-full border border-[#1f1f1f]">Ready to send</span>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>}
      </div>

      {/* Prospect picker modal */}
      {showProspectPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-5 w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Pick a prospect</h3>
              <button onClick={() => { setShowProspectPicker(false); setProspectSearch(''); }} aria-label="Close" className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <input
              type="text"
              placeholder="Search prospects..."
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition mb-3"
              value={prospectSearch}
              onChange={e => setProspectSearch(e.target.value)}
            />
            <div className="overflow-y-auto flex-1 space-y-1">
              {loadingProspects ? (
                <div className="flex items-center justify-center py-8">
                  <div role="status" aria-label="Loading" className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : prospects.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">No prospects found</p>
              ) : prospects.filter(p => {
                const q = prospectSearch.toLowerCase();
                if (!q) return true;
                return (
                  p.name.toLowerCase().includes(q) ||
                  (p.email || '').toLowerCase().includes(q) ||
                  (p.website || '').toLowerCase().includes(q)
                );
              }).map(p => (
                <button
                  key={p.id}
                  onClick={() => pickProspect(p)}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1a1a1a] transition group"
                >
                  <p className="text-sm text-gray-200 group-hover:text-white transition">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.email && <p className="text-xs text-gray-600 truncate">{p.email}</p>}
                    {p.website && <p className="text-xs text-gray-700">· {p.website}</p>}
                  </div>
                  {p.industry && <p className="text-[11px] text-gray-700 mt-0.5">{p.industry}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </DashboardLayout>
  );
}
