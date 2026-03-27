'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
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
      <button onClick={onClose} className="text-gray-500 hover:text-white ml-2">✕</button>
    </div>
  );
}

// ── Proposal preview renderer ─────────────────────────────────────────────────
function ProposalPreview({
  proposal,
  markdown,
  businessName,
  contactName,
  onEmail,
  onCopy,
  onDownloadPdf,
}: {
  proposal: ProposalSection;
  markdown: string;
  businessName: string;
  contactName: string;
  onEmail: () => void;
  onCopy: () => void;
  onDownloadPdf: () => void;
}) {
  const date = (() => { try { return new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return new Date().toISOString().split('T')[0]; } })();
  void markdown;

  return (
    <div className="flex flex-col h-full">
      {/* Action bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[#1f1f1f] bg-[#080808] flex-shrink-0">
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

      {/* Proposal document */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center border-b border-[#2a2a2a] pb-8">
            <div className="text-4xl font-black mb-1">
              AK<span className="text-[#D4AF37]">AI</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-6 uppercase tracking-wide">
              PROPOSAL FOR {businessName.toUpperCase()}
            </h1>
            <p className="text-sm text-gray-400 mt-2">Prepared by AKAI — {date}</p>
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
                    <th className="text-left px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wider">Module</th>
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
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProposalsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

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
    const subject = encodeURIComponent(`AKAI Proposal for ${businessName}`);
    const body = encodeURIComponent(generatedMarkdown);
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
          subject: `AKAI Proposal for ${businessName}`,
          body: generatedMarkdown,
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
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }, [generatedMarkdown, businessName, contactEmail]);

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
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
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
            <p className="text-xs text-gray-500 mt-0.5">AI-generated, personalised proposals for any prospect</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] font-medium">Live</span>
        </header>

        {/* Two-panel layout */}
        <div className="flex flex-1 overflow-hidden">

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
                    <span className="w-3 h-3 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
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

              {/* Section 2 — Modules */}
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
                      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
                    <p className="text-xs text-gray-600">Loading...</p>
                  ) : (
                    <div className="space-y-1">
                      {savedProposals.map(p => (
                        <button
                          key={p.id}
                          onClick={() => loadSavedProposalContent(p)}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#111] transition group"
                        >
                          <p className="text-xs text-gray-300 group-hover:text-white transition truncate">{p.businessName}</p>
                          <p className="text-[11px] text-gray-600">{p.modules.length} module{p.modules.length !== 1 ? 's' : ''}</p>
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
                contactName={contactName}
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
                    AKAI writes a personalised proposal based on the prospect&apos;s industry, your selected modules, and the tone you pick.
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
        </div>
      </div>

      {/* Prospect picker modal */}
      {showProspectPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-5 w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Pick a prospect</h3>
              <button onClick={() => setShowProspectPicker(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <input
              type="text"
              placeholder="Search prospects..."
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition mb-3"
              onChange={e => {
                const q = e.target.value.toLowerCase();
                // Filter inline by searching existing loaded prospects
                const filtered = prospects.filter(p =>
                  p.name.toLowerCase().includes(q) ||
                  (p.email || '').toLowerCase().includes(q) ||
                  (p.website || '').toLowerCase().includes(q)
                );
                // Re-render with filtered — use a dataset attribute approach
                const list = document.getElementById('prospect-list');
                if (list) {
                  list.querySelectorAll('[data-prospect]').forEach(el => {
                    const name = (el.getAttribute('data-name') || '').toLowerCase();
                    const email = (el.getAttribute('data-email') || '').toLowerCase();
                    (el as HTMLElement).style.display = (name.includes(q) || email.includes(q)) ? '' : 'none';
                  });
                }
              }}
            />
            <div id="prospect-list" className="overflow-y-auto flex-1 space-y-1">
              {loadingProspects ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : prospects.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">No prospects found</p>
              ) : prospects.map(p => (
                <button
                  key={p.id}
                  data-prospect
                  data-name={p.name}
                  data-email={p.email || ''}
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
