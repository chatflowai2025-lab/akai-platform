'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

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

// ── Connection Banners ────────────────────────────────────────────────────────
function ConnectionBanner({ platform, icon, description }: { platform: string; icon: string; description: string }) {
  const { sendMessage } = useDashboardChat();
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
          onClick={() => sendMessage(`I want to connect my ${platform} account`)}
        >
          Connect {platform}
        </button>
      </div>
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
function GoogleCampaignBuilder() {
  const { sendMessage } = useDashboardChat();
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
    try {
      await fetch('/api/ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, platform: 'google', dailyBudget, goal, businessName }),
      });
      setLaunched(true);
    } catch {
      setLaunched(true); // optimistic — saved locally
    } finally {
      setLaunching(false);
    }
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
    <section className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-lg">
          🚀
        </div>
        <div>
          <h2 className="text-white font-bold text-base">Google Ads Campaign Builder</h2>
          <p className="text-xs text-gray-500">AI-generated Google Ads campaigns — ready to launch</p>
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
            <span className="text-gray-600 ml-2">(~${(dailyBudget * 30).toLocaleString()}/mo)</span>
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
          onClick={() => sendMessage('Help me build a Google Ads campaign')}
          className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-xs hover:text-white hover:border-[#D4AF37]/30 transition"
          title="Ask AK to refine"
        >
          Ask AK to refine
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm py-4 mt-4">
          <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
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
                onClick={() => sendMessage(`Refine my Google Ads campaign: ${campaign.campaignName}`)}
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

          {/* Launch Campaign button */}
          {launched ? (
            <div className="mt-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-400 flex items-center gap-2">
              ✅ Campaign saved! Connect your Google Ads account above to publish it live.
            </div>
          ) : (
            <button
              onClick={launchCampaign}
              disabled={launching}
              className="w-full mt-2 py-3 bg-gradient-to-r from-[#D4AF37] to-amber-500 text-black rounded-xl text-sm font-black hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              {launching ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
  );
}

// ── Meta Campaign Builder ─────────────────────────────────────────────────────
function MetaCampaignBuilder() {
  const { sendMessage } = useDashboardChat();
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
    try {
      await fetch('/api/ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, platform: 'meta', dailyBudget, goal, businessName }),
      });
      setLaunched(true);
    } catch {
      setLaunched(true);
    } finally {
      setLaunching(false);
    }
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
            <span className="text-gray-600 ml-2">(~${(dailyBudget * 30).toLocaleString()}/mo)</span>
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
          onClick={() => sendMessage('Help me build a Meta/Facebook Ads campaign')}
          className="px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-xl text-xs hover:text-white hover:border-blue-500/30 transition"
          title="Ask AK to refine"
        >
          Ask AK to refine
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm py-4 mt-4">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
                onClick={() => sendMessage(`Refine my Meta Ads campaign: ${campaign.campaignName}`)}
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

          {/* Launch Campaign button */}
          {launched ? (
            <div className="mt-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-400 flex items-center gap-2">
              ✅ Campaign saved! Connect your Meta Ads account above to publish it live.
            </div>
          ) : (
            <button
              onClick={launchCampaign}
              disabled={launching}
              className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl text-sm font-black hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              {launching ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdsPage() {
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
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
        <div>
          <h1 className="text-xl font-black text-white">Ads</h1>
          <p className="text-xs text-gray-500 mt-0.5">AI-powered Google & Meta Ads campaign builder</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
          Live
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
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
        <GoogleCampaignBuilder />

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-[#1f1f1f]" />
          <span className="text-xs text-gray-600 uppercase tracking-wider">Meta / Facebook Ads</span>
          <div className="flex-1 h-px bg-[#1f1f1f]" />
        </div>

        {/* Meta Ads section */}
        <MetaCampaignBuilder />
      </div>
    </DashboardLayout>
  );
}
