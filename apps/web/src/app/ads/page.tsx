'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

// ── Safe sendMessage wrapper — prevents crash if chat context not ready ────
function safeSend(sendMessage: (t: string) => void, text: string) {
  try { sendMessage(text); } catch { /* chat not ready */ }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdGroup {
  name: string;
  headlines: string[];
  descriptions: string[];
  keywords: string[];
}

interface Campaign {
  campaignName: string;
  adGroups: AdGroup[];
}

interface AdSet {
  name: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  audience: string;
}

interface MetaCampaign {
  campaignName: string;
  adSets: AdSet[];
}

interface LaunchedCampaign {
  id: string;
  platform: 'google' | 'meta';
  campaignName: string;
  dailyBudget: number;
  goal: string;
  businessName: string;
  targetAudience: string;
  location: string;
  status: 'pending';
  createdAt: string;
}

// ── localStorage helpers ───────────────────────────────────────────────────────
const STORAGE_KEY = 'akai_launched_campaigns';

function loadLaunchedCampaigns(): LaunchedCampaign[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as LaunchedCampaign[];
  } catch {
    return [];
  }
}

function saveLaunchedCampaign(campaign: LaunchedCampaign): void {
  if (typeof window === 'undefined') return;
  const existing = loadLaunchedCampaigns();
  existing.unshift(campaign);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

// ── Launch Modal ──────────────────────────────────────────────────────────────
interface LaunchModalProps {
  campaignName: string;
  dailyBudget: number;
  goal: string;
  businessName: string;
  targetAudience: string;
  location: string;
  platform: 'google' | 'meta';
  onClose: () => void;
}

function LaunchModal({ campaignName, dailyBudget, goal, businessName, targetAudience, location, platform, onClose }: LaunchModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🚀</div>
          <h2 className="text-white font-black text-xl">Campaign submitted!</h2>
          <p className="text-gray-400 text-sm mt-2">We&apos;ll notify you when it goes live</p>
        </div>

        {/* Summary */}
        <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Campaign</span>
            <span className="text-sm text-white font-bold">{campaignName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Platform</span>
            <span className="text-sm text-white font-medium">{platform === 'google' ? '📊 Google Ads' : '👥 Meta Ads'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Budget</span>
            <span className="text-sm text-[#D4AF37] font-bold">${dailyBudget}/day</span>
          </div>
          {businessName && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Business</span>
              <span className="text-sm text-white">{businessName}</span>
            </div>
          )}
          {goal && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Goal</span>
              <span className="text-sm text-white capitalize">{goal}</span>
            </div>
          )}
          {targetAudience && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Audience</span>
              <span className="text-sm text-gray-300">{targetAudience}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Location</span>
              <span className="text-sm text-gray-300">{location}</span>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 mb-6">
          <span className="text-lg">🟡</span>
          <div>
            <p className="text-yellow-400 text-sm font-semibold">Pending approval</p>
            <p className="text-yellow-400/60 text-xs">Within 24–48h once Google Ads token is approved</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition"
        >
          Got it — close
        </button>
      </div>
    </div>
  );
}

// ── Campaigns List (tab) ──────────────────────────────────────────────────────
function CampaignsList() {
  const [campaigns, setCampaigns] = useState<LaunchedCampaign[]>([]);

  useEffect(() => {
    setCampaigns(loadLaunchedCampaigns());
  }, []);

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">📭</div>
        <h3 className="text-white font-bold text-lg mb-2">No campaigns yet</h3>
        <p className="text-gray-500 text-sm">Build your first one above</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
        {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} submitted
      </p>
      {campaigns.map((c) => (
        <div key={c.id} className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{c.platform === 'google' ? '📊' : '👥'}</span>
                <h3 className="text-white font-bold text-sm truncate">{c.campaignName}</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">{c.businessName}{c.targetAudience ? ` · ${c.targetAudience}` : ''}{c.location ? ` · ${c.location}` : ''}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-medium flex items-center gap-1">
                  🟡 Pending approval
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 font-medium">
                  ${c.dailyBudget}/day
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 font-medium capitalize">
                  {c.goal}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p suppressHydrationWarning className="text-xs text-gray-600">
                {new Date(c.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {c.platform === 'google' ? 'Google Ads' : 'Meta Ads'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
            <p className="text-xs text-yellow-400/70 flex items-center gap-1.5">
              <span>⏳</span>
              Estimated launch: Within 24–48h once Google Ads token is approved
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Connection Banners ────────────────────────────────────────────────────────
function ConnectionBanner({ platform, icon, description }: { platform: string; icon: string; description: string }) {
  const [showInfo, setShowInfo] = useState(false);
  const connectUrl = platform === 'Google Ads'
    ? 'https://ads.google.com/intl/en_au/home/'
    : 'https://www.facebook.com/business/ads';

  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#0d0d0d] border border-[#2a2a2a] flex items-center justify-center text-2xl flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-white font-bold text-sm">{platform}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-500 font-medium">
              Not connected
            </span>
          </div>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <button
          className="flex-shrink-0 px-4 py-2 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold hover:bg-[#D4AF37]/10 transition"
          onClick={() => setShowInfo(v => !v)}
        >
          Connect {platform.split(' ')[0]}
        </button>
      </div>
      {showInfo && (
        <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
          <p className="text-xs text-gray-400 mb-3">
            {platform === 'Google Ads'
              ? 'Connect your Google Ads account to launch campaigns directly from AKAI. You\'ll need an active Google Ads account.'
              : 'Connect your Meta Business account to run Facebook and Instagram ads from AKAI.'}
          </p>
          <div className="flex gap-2">
            <a href={connectUrl} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-xs font-bold hover:opacity-90 transition">
              Open {platform} →
            </a>
            <span className="text-xs text-gray-600 self-center">Campaigns go live via Google Ads API — review your preview before launching.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ad Group Card ─────────────────────────────────────────────────────────────
function AdGroupCard({ group, index }: { group: AdGroup; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#151515] transition text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-white font-semibold text-sm">{group.name}</span>
        </div>
        <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-[#1f1f1f] pt-4">
          {/* Headlines */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
              Headlines ({group.headlines.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {group.headlines.map((h, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Descriptions */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
              Descriptions
            </p>
            <ul className="space-y-1.5">
              {group.descriptions.map((d, i) => (
                <li key={i} className="text-sm text-gray-300 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 leading-relaxed">
                  {d}
                </li>
              ))}
            </ul>
          </div>

          {/* Keywords */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
              Keywords
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.keywords.map((k, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ad Set Card (Meta) ────────────────────────────────────────────────────────
function AdSetCard({ adSet, index }: { adSet: AdSet; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#151515] transition text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-white font-semibold text-sm">{adSet.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{adSet.cta}</span>
        </div>
        <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-[#1f1f1f] pt-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Primary Text</p>
            <p className="text-sm text-gray-300 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">{adSet.primaryText}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Headline</p>
              <p className="text-sm text-white font-semibold bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">{adSet.headline}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Description</p>
              <p className="text-sm text-gray-300 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">{adSet.description}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Target Audience</p>
            <p className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">{adSet.audience}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Google Campaign Builder ───────────────────────────────────────────────────
function GoogleCampaignBuilder({ onCampaignLaunched }: { onCampaignLaunched: () => void }) {
  const { sendMessage } = useDashboardChat();
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [location, setLocation] = useState('');
  const [dailyBudget, setDailyBudget] = useState(50);
  const [goal, setGoal] = useState<'leads' | 'sales' | 'awareness'>('leads');
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const GOAL_OPTIONS: { value: 'leads' | 'sales' | 'awareness'; label: string; icon: string }[] = [
    { value: 'leads', label: 'Generate Leads', icon: '🎯' },
    { value: 'sales', label: 'Drive Sales', icon: '💰' },
    { value: 'awareness', label: 'Build Awareness', icon: '📣' },
  ];

  const buildCampaign = async () => {
    if (!businessName.trim()) return;
    setLoading(true);
    setError(null);
    setCampaign(null);
    setLaunched(false);
    try {
      const res = await fetch('/api/ads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, targetAudience, location, budget: String(dailyBudget * 30), goal, platform: 'google' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Campaign generation failed');
      setCampaign(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to build campaign: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const launchCampaign = async () => {
    if (!campaign) return;
    setLaunching(true);
    const launchedData: LaunchedCampaign = {
      id: `google_${Date.now()}`,
      platform: 'google',
      campaignName: campaign.campaignName,
      dailyBudget,
      goal,
      businessName,
      targetAudience,
      location,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    try {
      await fetch('/api/ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, platform: 'google', dailyBudget, goal, businessName }),
      });
    } catch {
      // optimistic
    }
    saveLaunchedCampaign(launchedData);
    try {
      const { getFirebaseDb } = await import('@/lib/firebase');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const db = getFirebaseDb();
      if (db && user) {
        await addDoc(collection(db, 'users', user.uid, 'adCampaigns'), {
          ...launchedData,
          createdAt: serverTimestamp(),
        });
      }
    } catch { /* non-fatal */ }
    setLaunched(true);
    setLaunching(false);
    setShowModal(true);
    onCampaignLaunched();
  };

  const copyCampaign = async () => {
    if (!campaign) return;
    const lines: string[] = [`CAMPAIGN: ${campaign.campaignName}\n`];
    campaign.adGroups.forEach((g, i) => {
      lines.push(`AD GROUP ${i + 1}: ${g.name}`);
      lines.push(`Headlines:\n${g.headlines.map((h) => `  - ${h}`).join('\n')}`);
      lines.push(`Descriptions:\n${g.descriptions.map((d) => `  - ${d}`).join('\n')}`);
      lines.push(`Keywords:\n${g.keywords.map((k) => `  - ${k}`).join('\n')}\n`);
    });
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {showModal && campaign && (
        <LaunchModal
          campaignName={campaign.campaignName}
          dailyBudget={dailyBudget}
          goal={goal}
          businessName={businessName}
          targetAudience={targetAudience}
          location={location}
          platform="google"
          onClose={() => setShowModal(false)}
        />
      )}

      <section className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-lg">
            🚀
          </div>
          <div>
            <h2 className="text-white font-bold text-base">Google Ads Campaign Builder</h2>
            <p className="text-xs text-gray-500">AI-generated Google Ads campaigns — ready to launch</p>
            <p className="text-xs text-amber-500/70 mt-0.5">Campaigns are AI-generated and ready. Google Ads connection coming soon.</p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          {/* Goal selector */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 block">
              Campaign goal
            </label>
            <div className="flex gap-2">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGoal(opt.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition ${
                    goal === opt.value
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                      : 'bg-[#0d0d0d] text-gray-400 border-[#2a2a2a] hover:border-[#D4AF37]/30 hover:text-white'
                  }`}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Business name */}
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Business name *"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Target audience (e.g. small businesses)"
              className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g. Sydney, Australia)"
              className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
            />
          </div>

          {/* Daily budget slider */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 block">
              Daily budget — <span className="text-[#D4AF37] font-bold">${dailyBudget}/day</span>
              <span suppressHydrationWarning className="text-gray-600 ml-2">(~${(dailyBudget * 30).toLocaleString()}/mo)</span>
            </label>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={dailyBudget}
              onChange={(e) => setDailyBudget(Number(e.target.value))}
              className="w-full accent-[#D4AF37] cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>$5/day</span>
              <span>$200/day</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={buildCampaign}
            disabled={loading || !businessName.trim()}
            className="flex-1 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition"
          >
            {loading ? 'Building campaign…' : 'Build my campaign'}
          </button>
          <button
            onClick={() => safeSend(sendMessage, 'Help me build a Google Ads campaign')}
            className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-xs hover:text-white hover:border-[#D4AF37]/30 transition"
            title="Ask AK to refine"
          >
            Ask AK to refine
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 text-sm py-4 mt-4">
            <div role="status" aria-label="Loading" className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            AI is building your campaign — this takes about 10 seconds…
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {campaign && (
          <div className="mt-6 space-y-4">
            {/* Campaign header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Campaign</p>
                <h3 className="text-white font-black text-lg mt-0.5">{campaign.campaignName}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyCampaign}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#D4AF37]/30 transition"
                >
                  {copied ? '✅ Copied!' : '📋 Copy campaign'}
                </button>
                <button
                  onClick={() => safeSend(sendMessage, `Refine my Google Ads campaign: ${campaign.campaignName}`)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition"
                >
                  Ask AK to refine
                </button>
              </div>
            </div>

            {/* Ad groups */}
            <div className="space-y-3">
              {campaign.adGroups.map((group, i) => (
                <AdGroupCard key={i} group={group} index={i} />
              ))}
            </div>

            <p className="text-xs text-gray-600 text-center pt-2">
              3 ad groups · {campaign.adGroups.reduce((s, g) => s + g.headlines.length, 0)} headlines · {campaign.adGroups.reduce((s, g) => s + g.keywords.length, 0)} keywords
            </p>

            {/* Launch Campaign button / status */}
            {launched ? (
              <div className="mt-2 space-y-3">
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-400 flex items-center gap-2">
                  ✅ Campaign submitted — check the Campaigns tab for status.
                </div>
                {/* Status card */}
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span>🟡</span>
                    <span className="text-yellow-400 font-semibold text-sm">Pending approval</span>
                  </div>
                  <p className="text-xs text-yellow-400/70">Estimated launch: Within 24–48h once Google Ads token is approved</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-400">
                    <span><span className="text-gray-600">Budget:</span> ${dailyBudget}/day</span>
                    <span><span className="text-gray-600">Goal:</span> <span className="capitalize">{goal}</span></span>
                    {targetAudience && <span className="col-span-2"><span className="text-gray-600">Audience:</span> {targetAudience}</span>}
                    {location && <span className="col-span-2"><span className="text-gray-600">Location:</span> {location}</span>}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={launchCampaign}
                disabled={launching}
                className="w-full mt-2 py-3 bg-gradient-to-r from-[#D4AF37] to-amber-500 text-black rounded-xl text-sm font-black hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center gap-2"
              >
                {launching ? (
                  <>
                    <span role="status" aria-label="Loading" className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Launching…
                  </>
                ) : (
                  <>🚀 Launch Campaign — ${dailyBudget}/day</>
                )}
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}

// ── Meta Campaign Builder ─────────────────────────────────────────────────────
function MetaCampaignBuilder({ onCampaignLaunched }: { onCampaignLaunched: () => void }) {
  const { sendMessage } = useDashboardChat();
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [location, setLocation] = useState('');
  const [dailyBudget, setDailyBudget] = useState(30);
  const [goal, setGoal] = useState<'leads' | 'sales' | 'awareness'>('leads');
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<MetaCampaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const GOAL_OPTIONS: { value: 'leads' | 'sales' | 'awareness'; label: string; icon: string }[] = [
    { value: 'leads', label: 'Generate Leads', icon: '🎯' },
    { value: 'sales', label: 'Drive Sales', icon: '💰' },
    { value: 'awareness', label: 'Build Awareness', icon: '📣' },
  ];

  const buildCampaign = async () => {
    if (!businessName.trim()) return;
    setLoading(true);
    setError(null);
    setCampaign(null);
    setLaunched(false);
    try {
      const res = await fetch('/api/ads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, targetAudience, location, budget: String(dailyBudget * 30), goal, platform: 'meta' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Campaign generation failed');
      setCampaign(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to build Meta campaign: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const launchCampaign = async () => {
    if (!campaign) return;
    setLaunching(true);
    const launchedData: LaunchedCampaign = {
      id: `meta_${Date.now()}`,
      platform: 'meta',
      campaignName: campaign.campaignName,
      dailyBudget,
      goal,
      businessName,
      targetAudience,
      location,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    try {
      await fetch('/api/ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, platform: 'meta', dailyBudget, goal, businessName }),
      });
    } catch {
      // optimistic
    }
    saveLaunchedCampaign(launchedData);
    try {
      const { getFirebaseDb } = await import('@/lib/firebase');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const db = getFirebaseDb();
      if (db && user) {
        await addDoc(collection(db, 'users', user.uid, 'adCampaigns'), {
          ...launchedData,
          createdAt: serverTimestamp(),
        });
      }
    } catch { /* non-fatal */ }
    setLaunched(true);
    setLaunching(false);
    setShowModal(true);
    onCampaignLaunched();
  };

  const copyCampaign = async () => {
    if (!campaign) return;
    const lines: string[] = [`META CAMPAIGN: ${campaign.campaignName}\n`];
    campaign.adSets.forEach((s, i) => {
      lines.push(`AD SET ${i + 1}: ${s.name}`);
      lines.push(`Audience: ${s.audience}`);
      lines.push(`Primary Text:\n${s.primaryText}`);
      lines.push(`Headline: ${s.headline}`);
      lines.push(`Description: ${s.description}`);
      lines.push(`CTA: ${s.cta}\n`);
    });
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {showModal && campaign && (
        <LaunchModal
          campaignName={campaign.campaignName}
          dailyBudget={dailyBudget}
          goal={goal}
          businessName={businessName}
          targetAudience={targetAudience}
          location={location}
          platform="meta"
          onClose={() => setShowModal(false)}
        />
      )}

      <section className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg">
            👥
          </div>
          <div>
            <h2 className="text-white font-bold text-base">Meta / Facebook Ads Builder</h2>
            <p className="text-xs text-gray-500">AI-generated Facebook & Instagram ad copy — ready for Meta Ads Manager</p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          {/* Goal selector */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 block">
              Campaign goal
            </label>
            <div className="flex gap-2">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGoal(opt.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition ${
                    goal === opt.value
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-[#0d0d0d] text-gray-400 border-[#2a2a2a] hover:border-blue-500/30 hover:text-white'
                  }`}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Business name */}
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Business name *"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Target audience (e.g. small businesses)"
              className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g. Sydney, Australia)"
              className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition"
            />
          </div>

          {/* Daily budget slider */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 block">
              Daily budget — <span className="text-blue-400 font-bold">${dailyBudget}/day</span>
              <span suppressHydrationWarning className="text-gray-600 ml-2">(~${(dailyBudget * 30).toLocaleString()}/mo)</span>
            </label>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={dailyBudget}
              onChange={(e) => setDailyBudget(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>$5/day</span>
              <span>$200/day</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={buildCampaign}
            disabled={loading || !businessName.trim()}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition"
          >
            {loading ? 'Building Meta campaign…' : 'Build Meta campaign'}
          </button>
          <button
            onClick={() => safeSend(sendMessage, 'Help me build a Meta/Facebook Ads campaign')}
            className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-xs hover:text-white hover:border-blue-500/30 transition"
            title="Ask AK to refine"
          >
            Ask AK to refine
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 text-sm py-4 mt-4">
            <div role="status" aria-label="Loading" className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            AI is building your Meta campaign — this takes about 10 seconds…
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {campaign && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Meta Campaign</p>
                <h3 className="text-white font-black text-lg mt-0.5">{campaign.campaignName}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyCampaign}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-blue-500/30 transition"
                >
                  {copied ? '✅ Copied!' : '📋 Copy campaign'}
                </button>
                <button
                  onClick={() => safeSend(sendMessage, `Refine my Meta Ads campaign: ${campaign.campaignName}`)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition"
                >
                  Ask AK to refine
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {campaign.adSets.map((adSet, i) => (
                <AdSetCard key={i} adSet={adSet} index={i} />
              ))}
            </div>

            <p className="text-xs text-gray-600 text-center pt-2">
              3 ad sets · Facebook + Instagram · Ready for Meta Ads Manager
            </p>

            {/* Launch Campaign button / status */}
            {launched ? (
              <div className="mt-2 space-y-3">
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-400 flex items-center gap-2">
                  ✅ Campaign submitted — check the Campaigns tab for status.
                </div>
                {/* Status card */}
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span>🟡</span>
                    <span className="text-yellow-400 font-semibold text-sm">Pending approval</span>
                  </div>
                  <p className="text-xs text-yellow-400/70">Estimated launch: Within 24–48h once Google Ads token is approved</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-400">
                    <span><span className="text-gray-600">Budget:</span> ${dailyBudget}/day</span>
                    <span><span className="text-gray-600">Goal:</span> <span className="capitalize">{goal}</span></span>
                    {targetAudience && <span className="col-span-2"><span className="text-gray-600">Audience:</span> {targetAudience}</span>}
                    {location && <span className="col-span-2"><span className="text-gray-600">Location:</span> {location}</span>}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={launchCampaign}
                disabled={launching}
                className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-sm font-black hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center gap-2"
              >
                {launching ? (
                  <>
                    <span role="status" aria-label="Loading" className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Launching…
                  </>
                ) : (
                  <>🚀 Launch Campaign — ${dailyBudget}/day</>
                )}
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'build' | 'campaigns'>('build');
  const [campaignCount, setCampaignCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    setCampaignCount(loadLaunchedCampaigns().length);
  }, []);

  const handleCampaignLaunched = () => {
    setCampaignCount(loadLaunchedCampaigns().length);
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
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
        <div>
          <Breadcrumb module="Ads" />
          <div className="flex items-center gap-2">
            <span className="text-xl">📣</span>
            <h1 className="text-xl font-black text-white">Ads</h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">AI-powered Google & Meta Ads campaign builder</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
          Live
        </span>
      </header>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 px-8 pt-5 border-b border-[#1f1f1f]">
        <button
          onClick={() => setActiveTab('build')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition border-b-2 -mb-px ${
            activeTab === 'build'
              ? 'text-[#D4AF37] border-[#D4AF37] bg-[#D4AF37]/5'
              : 'text-gray-500 border-transparent hover:text-white'
          }`}
        >
          🛠 Build Campaign
        </button>
        <button
          onClick={() => { setActiveTab('campaigns'); setCampaignCount(loadLaunchedCampaigns().length); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-xl transition border-b-2 -mb-px ${
            activeTab === 'campaigns'
              ? 'text-[#D4AF37] border-[#D4AF37] bg-[#D4AF37]/5'
              : 'text-gray-500 border-transparent hover:text-white'
          }`}
        >
          📋 Campaigns
          {campaignCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold min-w-[20px] text-center">
              {campaignCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {activeTab === 'campaigns' ? (
          <CampaignsList />
        ) : (
          <>
            {/* Connection banners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ConnectionBanner
                platform="Google Ads"
                icon="📊"
                description="Connect your Google Ads account to publish campaigns directly and track performance in real time."
              />
              <ConnectionBanner
                platform="Meta Ads"
                icon="👥"
                description="Connect your Meta Business account to publish Facebook & Instagram ads and track results."
              />
            </div>

            {/* Google Ads section */}
            <GoogleCampaignBuilder onCampaignLaunched={handleCampaignLaunched} />

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-[#1f1f1f]" />
              <span className="text-xs text-gray-600 uppercase tracking-wider">Meta / Facebook Ads</span>
              <div className="flex-1 h-px bg-[#1f1f1f]" />
            </div>

            {/* Meta Ads section */}
            <MetaCampaignBuilder onCampaignLaunched={handleCampaignLaunched} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
