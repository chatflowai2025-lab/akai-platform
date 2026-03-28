'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

// ── Safe sendMessage wrapper — prevents crash if chat context not ready ────
function safeSend(sendMessage: (t: string) => void, text: string) {
  try { sendMessage(text); } catch { /* chat not ready */ }
}
import { isSafeMode } from '@/lib/beta-config';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const RAILWAY_API = 'https://api-server-production-2a27.up.railway.app';
const RAILWAY_API_KEY = 'aiclozr_api_key_2026_prod';

// ── Types ─────────────────────────────────────────────────────────────────

interface VoiceConfig {
  setupComplete: boolean;
  script: {
    openingLine: string;
    hook: string;
    qualifyingQuestion: string;
    cta: string;
  };
  schedule: {
    days: string[];
    startHour: number;
    endHour: number;
    timezone: string;
    maxAttempts: number;
    voicemail: string;
  };
  phoneNumber: string;
  useOwnNumber: boolean;
  recordCalls: boolean;
  consentConfirmed: boolean;
  testCallCompleted: boolean;
  active: boolean;
}

interface RecentCall {
  id: string;
  leadName: string;
  phone: string;
  outcome: 'Qualified' | 'Not interested' | 'Voicemail' | 'No answer';
  duration: string;
  time: string;
}

const DEFAULT_CONFIG: VoiceConfig = {
  setupComplete: false,
  script: {
    openingLine: 'Hi, is that {{name}}? This is Sophie calling from {{businessName}}.',
    hook: '',
    qualifyingQuestion: '',
    cta: 'Book a call',
  },
  schedule: {
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    startHour: 9,
    endHour: 17,
    timezone: 'AEST',
    maxAttempts: 2,
    voicemail: 'Leave after 2nd attempt',
  },
  phoneNumber: '+61468075948',
  useOwnNumber: false,
  recordCalls: true,
  consentConfirmed: false,
  testCallCompleted: false,
  active: true,
};

// MOCK_CALLS reserved for future recent-calls display feature

// ── Outcome badge ─────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: RecentCall['outcome'] }) {
  const styles: Record<string, string> = {
    'Qualified': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Not interested': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Voicemail': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'No answer': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${styles[outcome]}`}>
      {outcome}
    </span>
  );
}

// ── Left Panel ─────────────────────────────────────────────────────────────

function LeftPanel({
  config,
  onToggleActive,
}: {
  config: VoiceConfig;
  onToggleActive: () => void;
}) {
  const { sendMessage } = useDashboardChat();

  const statusLabel = !config.setupComplete ? 'Setup needed' : config.active ? 'Ready' : 'Paused';
  const statusStyle = !config.setupComplete
    ? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    : config.active
    ? 'bg-green-500/10 text-green-400 border-green-500/20'
    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  const statusDot = !config.setupComplete
    ? 'bg-gray-400'
    : config.active
    ? 'bg-green-400 animate-pulse'
    : 'bg-yellow-400';

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col gap-5 pt-2">
      {/* Sophie avatar */}
      <div className="flex flex-col items-center gap-3 bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
        <div className="w-20 h-20 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37]/40 flex items-center justify-center text-3xl">
          🎙️
        </div>
        <div>
          <p className="text-white font-black text-center text-lg">Sophie</p>
          <p className="text-gray-500 text-xs text-center">AI Sales Agent</p>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${statusStyle}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          {statusLabel}
        </span>
      </div>

      {/* Quick stats */}
      {config.setupComplete && (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 space-y-3">
          <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Today</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Calls made</span>
              <span className="text-sm font-bold text-white">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Leads qualified</span>
              <span className="text-sm font-bold text-green-400">3</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Avg duration</span>
              <span className="text-sm font-bold text-white">2m 45s</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      {config.setupComplete && (
        <div className="space-y-2">
          <button
            onClick={onToggleActive}
            className={`w-full px-4 py-3 rounded-xl text-sm font-black transition-colors ${
              config.active
                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20'
                : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
            }`}
          >
            {config.active ? '⏸ Pause Sophie' : '▶ Resume Sophie'}
          </button>
          <button
            onClick={() => safeSend(sendMessage, 'Play me a sample Sophie call')}
            className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-gray-400 border border-[#2a2a2a] hover:text-white hover:border-[#3a3a3a] transition-colors"
          >
            🔊 Listen to a sample call
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step indicators ───────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < current
              ? 'w-6 bg-[#D4AF37]'
              : i === current
              ? 'w-6 bg-[#D4AF37]/60'
              : 'w-3 bg-[#2a2a2a]'
          }`}
        />
      ))}
    </div>
  );
}

// ── Setup Wizard ──────────────────────────────────────────────────────────

// ── Fallback script suggestions (industry-aware) ───────────────────────────

function getFallbackSuggestions(industry: string, bizName: string, location: string) {
  const ind = industry.toLowerCase();
  const loc = location || 'your area';
  const month = new Date().toLocaleString('default', { month: 'long' });

  if (ind.includes('kitchen') || ind.includes('interior') || ind.includes('renovation') || ind.includes('fitout')) {
    return {
      hooks: [
        `We help ${loc} homeowners get their dream kitchen designed and quoted — without spending months going back and forth`,
        `Most of our clients come to us after getting vague quotes from other suppliers — we do fixed-price, Italian-crafted kitchens from day one`,
        `We specialise in luxury kitchen fitouts for ${loc} homes — and we're booking consultations for ${month}`,
      ],
      questions: [
        'Have you already started getting quotes for your kitchen renovation?',
        'Are you working with an architect or designer, or are you planning it yourself?',
        `What's your timeline — are you looking to start in the next few months, or still in the planning phase?`,
      ],
    };
  }
  if (ind.includes('real estate') || ind.includes('property') || ind.includes('mortgage') || ind.includes('finance')) {
    return {
      hooks: [
        `We help ${loc} property buyers move faster — with pre-approval sorted before they even start inspecting`,
        `Most buyers waste weeks on the wrong loan — we match you to the right product in one conversation`,
        `We've helped hundreds of ${loc} clients buy their next property — we'd love to show you how`,
      ],
      questions: [
        'Are you currently pre-approved, or still in the research phase?',
        'Are you looking to buy in the next 90 days, or still planning?',
        'Is this your first property purchase, or have you done this before?',
      ],
    };
  }
  if (ind.includes('recruit') || ind.includes('hiring') || ind.includes('staffing') || ind.includes('hr')) {
    return {
      hooks: [
        `We help ${loc} businesses hire faster — typically placing in 2–3 weeks vs 8+ on the open market`,
        `We specialise in placing high-quality candidates that actually stay — our 12-month retention rate is over 90%`,
        `We've placed over 500 candidates in ${loc} — and we only get paid when you hire someone you love`,
      ],
      questions: [
        'Do you have any roles you\'re actively trying to fill right now?',
        'How long has your current vacancy been open?',
        'Are you using a recruiter at the moment, or managing it in-house?',
      ],
    };
  }
  // Generic fallback
  return {
    hooks: [
      `We help ${loc} businesses like yours get more qualified leads without the manual follow-up`,
      `Our clients typically see results within the first 30 days — and we only work with businesses we know we can help`,
      `We've worked with dozens of ${industry} businesses in ${loc} — and I'd love to show you what we do`,
    ],
    questions: [
      'Are you currently handling your own lead follow-up, or do you have someone doing that?',
      'What does your current sales process look like — are leads coming in consistently?',
      'Are you looking to grow your client base in the next quarter?',
    ],
  };
}

// ── AI Script Suggestions ──────────────────────────────────────────────────

function ScriptStep({ config, setConfig, userProfile, userId, onBack, onNext }: {
  config: VoiceConfig;
  setConfig: (c: VoiceConfig) => void;
  userProfile: unknown;
  userId?: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const profile = userProfile as { businessName?: string; industry?: string; location?: string; campaignConfig?: { businessName?: string; industry?: string; location?: string }; onboarding?: { businessName?: string; industry?: string; location?: string } } | null;
  const profileBizName = profile?.onboarding?.businessName || profile?.businessName || profile?.campaignConfig?.businessName || '';
  const profileIndustry = profile?.onboarding?.industry || profile?.industry || profile?.campaignConfig?.industry || '';
  const profileLocation = profile?.onboarding?.location || profile?.campaignConfig?.location || '';

  // Allow user to enter business context inline if profile not loaded
  const [manualBiz, setManualBiz] = useState(profileBizName);
  const [manualIndustry, setManualIndustry] = useState(profileIndustry);
  const [manualLocation, setManualLocation] = useState(profileLocation);

  const businessName = manualBiz || 'your business';
  const industry = manualIndustry || 'your industry';

  const [suggestions, setSuggestions] = useState<{ hooks: string[]; questions: string[] } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedHook, setSelectedHook] = useState<string | null>(config.script.hook || null);
  const [selectedQ, setSelectedQ] = useState<string | null>(config.script.qualifyingQuestion || null);
  const [showBizForm, setShowBizForm] = useState(!profileBizName);

  // Load onboarding data from Firestore on mount — pre-fill fields & auto-trigger
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const db = getFirebaseDb();
        if (!db) return;
        const snap = await getDoc(doc(db, 'users', userId));
        if (!snap.exists()) return;
        const data = snap.data();
        const ob = data.onboarding || data.campaignConfig || {};
        const biz = ob.businessName || data.businessName || '';
        const ind = ob.industry || data.industry || '';
        const loc = ob.location || '';
        if (biz) setManualBiz(biz);
        if (ind) setManualIndustry(ind);
        if (loc) setManualLocation(loc);
        if (biz) {
          setShowBizForm(false);
          // Auto-trigger generation with loaded values (pass directly to avoid stale state)
          void generateSuggestionsWithValues(biz, ind || 'your industry', loc || 'your area');
        }
      } catch { /* ignore — user can fill manually */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const generateSuggestionsWithValues = async (biz: string, ind: string, loc: string) => {
    setGenerating(true);
    // Update opening line with business name
    if (config.script.openingLine.includes('{{businessName}}') || config.script.openingLine.includes('[BusinessName]')) {
      setConfig({ ...config, script: { ...config.script, openingLine: `Hi, is that {{name}}? This is Sophie calling from ${biz}.` } });
    }

    // Try AI first — this is the primary path
    try {
      const res = await fetch(`${RAILWAY_API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
        body: JSON.stringify({
          message: `Generate 3 hook options and 3 qualifying question options for a Sophie AI outbound calling script.

Business: ${biz}
Industry: ${ind}
Location: ${loc}

Return ONLY valid JSON:
{
  "hooks": ["option 1", "option 2", "option 3"],
  "questions": ["question 1", "question 2", "question 3"]
}

Be specific to their industry and location. Australian English. Conversational, not salesy. Each hook max 2 sentences.`,
        }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await res.json() as { message?: string };
      if (data.message) {
        const match = data.message.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as { hooks?: string[]; questions?: string[] };
          if (parsed.hooks?.length && parsed.questions?.length) {
            setSuggestions({ hooks: parsed.hooks, questions: parsed.questions });
            if (!selectedHook && parsed.hooks[0]) setSelectedHook(parsed.hooks[0]);
            if (!selectedQ && parsed.questions[0]) setSelectedQ(parsed.questions[0]);
            setGenerating(false);
            return;
          }
        }
      }
      throw new Error('Invalid AI response');
    } catch {
      // Silent fallback to hardcoded suggestions
      const fallback = getFallbackSuggestions(ind, biz, loc);
      setSuggestions(fallback);
      if (!selectedHook) setSelectedHook(fallback.hooks[0] ?? null);
      if (!selectedQ) setSelectedQ(fallback.questions[0] ?? null);
      setGenerating(false);
    }
  };

  const generateSuggestions = () => {
    void generateSuggestionsWithValues(
      manualBiz || 'your business',
      manualIndustry || 'your industry',
      manualLocation || 'your area',
    );
  };

  const canProceed = (selectedHook || config.script.hook) && (selectedQ || config.script.qualifyingQuestion);

  const handleNext = () => {
    setConfig({
      ...config,
      script: {
        ...config.script,
        hook: selectedHook || config.script.hook,
        qualifyingQuestion: selectedQ || config.script.qualifyingQuestion,
      }
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">What should Sophie say?</h2>
          <p className="text-gray-500 mt-1 text-sm">We&apos;ve written options based on your business — just pick the ones that fit.</p>
        </div>
        <button onClick={generateSuggestions} disabled={generating} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-lg text-xs font-semibold hover:bg-[#D4AF37]/20 transition disabled:opacity-40">
          {generating ? <span role="status" aria-label="Loading" className="w-3 h-3 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" /> : '✨'} {generating ? 'AK is writing your script…' : 'Get AK\'s suggestions'}
        </button>
      </div>

      {/* Business context form — shown if profile not loaded */}
      {showBizForm && (
        <div className="bg-[#0d0d0d] border border-[#D4AF37]/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider">Tell Sophie about your business</p>
            {manualBiz && <button onClick={() => { setShowBizForm(false); generateSuggestions(); }} className="text-xs text-gray-500 hover:text-white transition">Done →</button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Business name</label>
              <input type="text" value={manualBiz} onChange={e => setManualBiz(e.target.value)}
                placeholder="e.g. AP Heritage Interior"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Industry</label>
              <input type="text" value={manualIndustry} onChange={e => setManualIndustry(e.target.value)}
                placeholder="e.g. luxury kitchens"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Location</label>
              <input type="text" value={manualLocation} onChange={e => setManualLocation(e.target.value)}
                placeholder="e.g. Sydney"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition" />
            </div>
          </div>
          <button
            onClick={() => { setShowBizForm(false); if (manualBiz) generateSuggestions(); }}
            disabled={!manualBiz || generating}
            className="w-full py-2 bg-[#D4AF37] text-black rounded-lg text-xs font-bold hover:opacity-90 transition disabled:opacity-40"
          >
            {generating ? 'AK is writing your script…' : '✨ Get AK\'s suggestions →'}
          </button>
        </div>
      )}

      {/* Opening line */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-2">Opening line</label>
        <input
          type="text"
          value={config.script.openingLine}
          onChange={e => setConfig({ ...config, script: { ...config.script, openingLine: e.target.value } })}
          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
        />
        <p className="text-xs text-gray-600 mt-1">Use &#123;&#123;name&#125;&#125; and &#123;&#123;businessName&#125;&#125; as placeholders</p>
      </div>

      {/* Hook suggestions */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-2">Hook — choose one {generating && <span className="text-[#D4AF37] ml-1">writing for {businessName}…</span>}</label>
        {generating ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-[#1a1a1a] rounded-xl animate-pulse" />)}</div>
        ) : suggestions?.hooks.length ? (
          <div className="space-y-2">
            {suggestions.hooks.map((hook, i) => (
              <button key={i} onClick={() => setSelectedHook(hook)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${selectedHook === hook ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-white' : 'bg-[#0a0a0a] border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-white'}`}>
                <span className={`text-xs font-bold mr-2 ${selectedHook === hook ? 'text-[#D4AF37]' : 'text-gray-600'}`}>Option {i+1}</span>
                {hook}
              </button>
            ))}
            <button onClick={() => setSelectedHook('')} className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${selectedHook === '' ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-white' : 'bg-[#0a0a0a] border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]'}`}>
              ✏️ Write my own
            </button>
            {selectedHook === '' && (
              <textarea value={config.script.hook} onChange={e => setConfig({ ...config, script: { ...config.script, hook: e.target.value } })}
                placeholder="Describe what you do and who you help..." rows={2}
                className="w-full bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors resize-none" />
            )}
          </div>
        ) : (
          <textarea value={config.script.hook} onChange={e => setConfig({ ...config, script: { ...config.script, hook: e.target.value } })}
            placeholder={`E.g. We help ${industry} businesses get more qualified enquiries without the manual follow-up.`} rows={2}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors resize-none" />
        )}
      </div>

      {/* Qualifying question suggestions */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-2">Qualifying question — choose one</label>
        {generating ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-[#1a1a1a] rounded-xl animate-pulse" />)}</div>
        ) : suggestions?.questions.length ? (
          <div className="space-y-2">
            {suggestions.questions.map((q, i) => (
              <button key={i} onClick={() => setSelectedQ(q)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${selectedQ === q ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-white' : 'bg-[#0a0a0a] border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-white'}`}>
                <span className={`text-xs font-bold mr-2 ${selectedQ === q ? 'text-[#D4AF37]' : 'text-gray-600'}`}>Option {i+1}</span>
                {q}
              </button>
            ))}
            <button onClick={() => setSelectedQ('')} className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${selectedQ === '' ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-white' : 'bg-[#0a0a0a] border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]'}`}>
              ✏️ Write my own
            </button>
            {selectedQ === '' && (
              <input type="text" value={config.script.qualifyingQuestion} onChange={e => setConfig({ ...config, script: { ...config.script, qualifyingQuestion: e.target.value } })}
                placeholder="Ask something to find out if they're a real prospect..."
                className="w-full bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors" />
            )}
          </div>
        ) : (
          <input type="text" value={config.script.qualifyingQuestion} onChange={e => setConfig({ ...config, script: { ...config.script, qualifyingQuestion: e.target.value } })}
            placeholder="Are you currently handling your own lead follow-up, or do you have someone doing that?"
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors" />
        )}
      </div>

      {/* CTA */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-2">Goal of the call</label>
        <div className="flex gap-2 flex-wrap">
          {['Book a call', 'Get a quote', 'Schedule a visit', 'Book a consultation'].map(cta => (
            <button key={cta} onClick={() => setConfig({ ...config, script: { ...config.script, cta } })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${config.script.cta === cta ? 'bg-[#D4AF37] text-black' : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:text-white'}`}>
              {cta}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="px-4 py-2.5 text-sm text-gray-500 hover:text-white transition-colors">← Back</button>
        <button onClick={handleNext} disabled={!canProceed}
          className="px-6 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-40">
          Next →
        </button>
      </div>
    </div>
  );
}

function SetupWizard({
  config,
  setConfig,
  onComplete,
  userEmail,
  userName,
  userProfile,
  userId,
  leadsSource,
}: {
  config: VoiceConfig;
  setConfig: (c: VoiceConfig) => void;
  onComplete: () => void;
  userEmail: string;
  userName: string;
  userProfile?: unknown;
  userId?: string;
  leadsSource?: 'akai' | 'uploaded' | 'unknown';
}) {
  const [step, setStep] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [testCallState, setTestCallState] = useState<'idle' | 'calling' | 'done' | 'failed'>('idle');
  const [testPhone, setTestPhone] = useState('');
  const [testFeedback, setTestFeedback] = useState<'up' | 'down' | null>(null);
  const [improvementNote, setImprovementNote] = useState('');
  const { sendMessage } = useDashboardChat();

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const TIMEZONES = ['AEST', 'AEDT', 'ACST', 'ACDT', 'AWST', 'NZST', 'NZT'];

  const toggleDay = (day: string) => {
    const days = config.schedule.days.includes(day)
      ? config.schedule.days.filter(d => d !== day)
      : [...config.schedule.days, day];
    setConfig({ ...config, schedule: { ...config.schedule, days } });
  };

  const fireTestCall = async () => {
    if (!testPhone) return;

    if (isSafeMode(userEmail)) {
      setTestCallState('calling');
      await new Promise(r => setTimeout(r, 2000));
      setTestCallState('done');
      return;
    }

    setTestCallState('calling');
    const script = [config.script.openingLine, config.script.hook, config.script.qualifyingQuestion, config.script.cta]
      .filter(Boolean)
      .join(' ');

    try {
      const res = await fetch(`${RAILWAY_API}/api/campaign/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
        body: JSON.stringify({
          leads: [{ name: userName || 'Test User', phone: testPhone }],
          script,
          userId: userEmail,
          campaignName: 'Sophie Test Call',
        }),
      });
      if (!res.ok) {
        console.error('[test call] non-ok response', res.status);
        setTestCallState('failed');
        return;
      }
    } catch (err) {
      console.error('[test call]', err);
      setTestCallState('failed');
      return;
    }
    setTestCallState('done');
  };

  const steps = [
    // Step 0: Meet Sophie
    <div key="step0" className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Meet Sophie 👋</h2>
        <p className="text-gray-500 mt-2 leading-relaxed">
          Sophie is your AI sales agent. She makes outbound calls, qualifies leads, and books meetings — 24/7 in plain Australian English.
        </p>
      </div>

      <button
        onClick={() => setShowTranscript(t => !t)}
        className="flex items-center gap-3 px-5 py-3 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[#D4AF37] text-sm font-semibold hover:bg-[#D4AF37]/20 transition-colors"
      >
        <span className="text-lg">{showTranscript ? '⏹' : '▶'}</span>
        {showTranscript ? 'Hide sample call' : 'Play sample call'}
      </button>

      {showTranscript && (
        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 space-y-4">
          <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Sample transcript</p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-[11px] font-bold text-[#D4AF37] pt-0.5 flex-shrink-0 w-14">Sophie</span>
              <p className="text-sm text-white/80 leading-relaxed">
                &quot;Hi, is that [Name]? This is Sophie calling from [BusinessName]. I&apos;m reaching out because we help [industry] businesses get more enquiries without the manual follow-up. Do you have 2 minutes?&quot;
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-[11px] font-bold text-blue-400 pt-0.5 flex-shrink-0 w-14">Lead</span>
              <p className="text-sm text-white/80 leading-relaxed">&ldquo;Sure, what&apos;s it about?&rdquo;</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[11px] font-bold text-[#D4AF37] pt-0.5 flex-shrink-0 w-14">Sophie</span>
              <p className="text-sm text-white/80 leading-relaxed">
                &ldquo;We automate your inbound lead qualification so your team only talks to people who are ready to buy. Does that sound relevant to what you&apos;re working on?&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setStep(1)}
        className="flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity"
      >
        Sounds good →
      </button>
    </div>,

    // Step 1: What should Sophie say? (AI-assisted)
    <ScriptStep
      key="step1"
      config={config}
      setConfig={setConfig}
      userProfile={userProfile}
      userId={userId}
      onBack={() => setStep(0)}
      onNext={() => setStep(2)}
    />,

    // Step 2: When should Sophie call?
    <div key="step2" className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">When should Sophie call?</h2>
        <p className="text-gray-500 mt-1 text-sm">Set the schedule for your outbound calls.</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-3">Days</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  config.schedule.days.includes(day)
                    ? 'bg-[#D4AF37] text-black'
                    : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:text-white'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-2">Start time</label>
            <select
              value={config.schedule.startHour}
              onChange={e => setConfig({ ...config, schedule: { ...config.schedule, startHour: Number(e.target.value) } })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-2">End time</label>
            <select
              value={config.schedule.endHour}
              onChange={e => setConfig({ ...config, schedule: { ...config.schedule, endHour: Number(e.target.value) } })}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-2">Timezone</label>
          <select
            value={config.schedule.timezone}
            onChange={e => setConfig({ ...config, schedule: { ...config.schedule, timezone: e.target.value } })}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
          >
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-2">Max attempts per lead</label>
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => setConfig({ ...config, schedule: { ...config.schedule, maxAttempts: n } })}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                  config.schedule.maxAttempts === n
                    ? 'bg-[#D4AF37] text-black'
                    : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-2">Voicemail</label>
          <div className="flex flex-col gap-2">
            {['Leave one', "Don't leave one", 'Leave after 2nd attempt'].map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setConfig({ ...config, schedule: { ...config.schedule, voicemail: opt } })}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                    config.schedule.voicemail === opt ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#3a3a3a] group-hover:border-[#5a5a5a]'
                  }`}
                >
                  {config.schedule.voicemail === opt && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
                <span
                  onClick={() => setConfig({ ...config, schedule: { ...config.schedule, voicemail: opt } })}
                  className="text-sm text-gray-300 cursor-pointer"
                >
                  {opt}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => setStep(1)} className="px-4 py-2.5 text-sm text-gray-500 hover:text-white transition-colors">← Back</button>
        <button
          onClick={() => setStep(3)}
          className="px-6 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity"
        >
          Next →
        </button>
      </div>
    </div>,

    // Step 3: Phone number
    <div key="step3" className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Your phone number</h2>
        <p className="text-gray-500 mt-1 text-sm">Choose which number Sophie calls from.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* AKAI number */}
        <button
          onClick={() => setConfig({ ...config, useOwnNumber: false, phoneNumber: '+61468075948' })}
          className={`text-left p-5 rounded-2xl border-2 transition-colors ${
            !config.useOwnNumber
              ? 'border-[#D4AF37] bg-[#D4AF37]/5'
              : 'border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a]'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!config.useOwnNumber ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#3a3a3a]'}`}>
              {!config.useOwnNumber && <span className="w-2 h-2 rounded-full bg-black" />}
            </div>
            <span className="text-sm font-bold text-white">Use AKAI&apos;s number</span>
          </div>
          <p className="text-[#D4AF37] font-mono text-sm mb-1">+61 468 075 948</p>
          <p className="text-xs text-gray-500">Calls come from our number. Simple setup.</p>
        </button>

        {/* Own number */}
        <button
          onClick={() => setConfig({ ...config, useOwnNumber: true, phoneNumber: '' })}
          className={`text-left p-5 rounded-2xl border-2 transition-colors ${
            config.useOwnNumber
              ? 'border-[#D4AF37] bg-[#D4AF37]/5'
              : 'border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a]'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${config.useOwnNumber ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#3a3a3a]'}`}>
              {config.useOwnNumber && <span className="w-2 h-2 rounded-full bg-black" />}
            </div>
            <span className="text-sm font-bold text-white">Use your own number</span>
          </div>
          <p className="text-xs text-gray-500 mb-2">Port your number or provide one. More trust, more setup.</p>
          {config.useOwnNumber && (
            <input
              type="tel"
              value={config.phoneNumber}
              onClick={e => e.stopPropagation()}
              onChange={e => setConfig({ ...config, phoneNumber: e.target.value })}
              placeholder="+61 4XX XXX XXX"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] mt-2"
            />
          )}
          {config.useOwnNumber && (
            <p className="text-xs text-yellow-500/70 mt-1.5">We&apos;ll verify this — takes 1–2 business days</p>
          )}
        </button>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => setStep(2)} className="px-4 py-2.5 text-sm text-gray-500 hover:text-white transition-colors">← Back</button>
        <button
          onClick={() => setStep(4)}
          disabled={config.useOwnNumber && !config.phoneNumber}
          className="px-6 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>,

    // Step 4: Rules & compliance
    <div key="step4" className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Rules &amp; compliance</h2>
        <p className="text-gray-500 mt-1 text-sm">Sophie operates within Australian law. Here&apos;s how.</p>
      </div>

      <div className="space-y-4">
        {/* DNC — always on */}
        <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-5 h-5 rounded bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-400 text-xs">✓</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-1">DNC Register — Always on</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Sophie will automatically check every number against Australia&apos;s Do Not Call Register before calling. We never call registered numbers.
              </p>
            </div>
          </div>
        </div>

        {/* Consent — AKAI-sourced: show DNC badge; user-uploaded or unknown: show checkbox */}
        {leadsSource === 'akai' ? (
          <div className="flex items-start gap-4 bg-[#0a1a0a] border border-green-500/20 rounded-2xl p-5">
            <div className="w-5 h-5 rounded bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-400 text-xs font-black">✓</span>
            </div>
            <div>
              <p className="text-sm font-bold text-green-300 mb-1">✅ DNC verified by AKAI</p>
              <p className="text-xs text-green-400/70 leading-relaxed">
                All numbers in your AKAI prospect list have already been checked against the Do Not Call Register. No action needed from you.
              </p>
            </div>
          </div>
        ) : (
          <label
            className="flex items-start gap-4 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 cursor-pointer group hover:border-[#2a2a2a] transition-colors"
            onClick={() => setConfig({ ...config, consentConfirmed: !config.consentConfirmed })}
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                config.consentConfirmed ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-[#3a3a3a] group-hover:border-[#5a5a5a]'
              }`}
            >
              {config.consentConfirmed && <span className="text-black text-xs font-black">✓</span>}
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              The leads I&apos;ve uploaded have either given consent to be contacted, or are business numbers (B2B calls don&apos;t require consent under the Spam Act 2003).
            </p>
          </label>
        )}

        {/* Recording */}
        <div className="flex items-center justify-between bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5">
          <div>
            <p className="text-sm font-bold text-white">Record calls for review</p>
            <p className="text-xs text-gray-500 mt-0.5">Listen back to calls to improve Sophie&apos;s performance</p>
          </div>
          <button
            onClick={() => setConfig({ ...config, recordCalls: !config.recordCalls })}
            className={`relative w-11 h-6 rounded-full transition-colors ${config.recordCalls ? 'bg-[#D4AF37]' : 'bg-[#2a2a2a]'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${config.recordCalls ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Responsibility */}
        <label className="flex items-start gap-4 bg-[#0d0d0d] border border-red-500/10 rounded-2xl p-5 cursor-pointer group">
          <div
            onClick={() => {
              // Will check during submit
            }}
            className="w-5 h-5 rounded border-2 border-[#3a3a3a] flex-shrink-0 mt-0.5"
          />
          <p className="text-sm text-gray-300 leading-relaxed">
            I understand Sophie will call on my behalf and I take responsibility for my lead list.
          </p>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => setStep(3)} className="px-4 py-2.5 text-sm text-gray-500 hover:text-white transition-colors">← Back</button>
        <button
          onClick={() => setStep(5)}
          disabled={leadsSource !== 'akai' && !config.consentConfirmed}
          className="px-6 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>,

    // Step 5: Test call
    <div key="step5" className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Test call — before going live</h2>
        <p className="text-gray-500 mt-1 text-sm">Before Sophie calls anyone on your list, she&apos;ll call YOU first.</p>
      </div>

      {testCallState === 'idle' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-2">Your phone number</label>
            <input
              type="tel"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              placeholder="+61 4XX XXX XXX"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
            <span className="text-yellow-500 text-sm">⏳</span>
            <p className="text-xs text-gray-500 leading-relaxed">Test calls are temporarily disabled while we finalise your account setup. Aaron will reach out directly to run your first call together.</p>
          </div>
        </div>
      )}

      {testCallState === 'calling' && (
        <div className="flex items-center gap-3 px-5 py-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
          <div role="status" aria-label="Loading" className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            {isSafeMode(userEmail)
              ? <p className="text-sm font-semibold text-blue-300">✅ Test call simulated (Safe Mode)</p>
              : <p className="text-sm font-semibold text-blue-300">Calling {testPhone}…</p>
            }
            <p className="text-xs text-blue-400/60 mt-0.5">Sophie is calling you now. Pick up!</p>
          </div>
        </div>
      )}

      {testCallState === 'failed' && (
        <div className="flex items-center gap-3 px-5 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <span className="text-red-400 text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-300">Test call failed — couldn&apos;t reach the calling service.</p>
            <p className="text-xs text-red-400/70 mt-0.5">Check your connection, then <button className="underline hover:text-red-300 transition-colors" onClick={() => setTestCallState('idle')}>try again</button>.</p>
          </div>
        </div>
      )}

      {testCallState === 'done' && testFeedback === null && (
        <div className="space-y-4">
          <div className="px-5 py-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
            <p className="text-sm font-semibold text-green-300">Call complete. How was that?</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setTestFeedback('up'); setConfig({ ...config, testCallCompleted: true }); }}
              className="flex items-center gap-2 px-5 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:border-[#3a3a3a] transition-colors"
            >
              👍 Great
            </button>
            <button
              onClick={() => setTestFeedback('down')}
              className="flex items-center gap-2 px-5 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:border-[#3a3a3a] transition-colors"
            >
              👎 Needs work
            </button>
          </div>
        </div>
      )}

      {testFeedback === 'up' && (
        <div className="space-y-4">
          <div className="px-5 py-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
            <p className="text-sm font-semibold text-green-300">🎉 Sophie is ready!</p>
            <p className="text-xs text-green-400/70 mt-1">Upload your leads in the Sales skill to start calling.</p>
          </div>
          <button
            onClick={onComplete}
            className="flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity"
          >
            Go live →
          </button>
        </div>
      )}

      {testFeedback === 'down' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-2">What would you change?</label>
            <textarea
              value={improvementNote}
              onChange={e => setImprovementNote(e.target.value)}
              placeholder="E.g. The opening was too formal, make it more casual..."
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                safeSend(sendMessage, `Update Sophie's script: ${improvementNote}`);
                setTestFeedback(null);
                setTestCallState('idle');
              }}
              className="px-5 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity"
            >
              Ask AK to update →
            </button>
            <button onClick={() => setStep(1)} className="px-4 py-2.5 text-sm text-gray-500 hover:text-white transition-colors">Edit script manually</button>
          </div>
        </div>
      )}

      {testCallState === 'idle' && (
        <div className="flex gap-3 pt-2">
          <button onClick={() => setStep(4)} className="px-4 py-2.5 text-sm text-gray-500 hover:text-white transition-colors">← Back</button>
        </div>
      )}
    </div>,
  ];

  return (
    <div className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <StepDots current={step} total={6} />
        <span className="text-xs text-gray-600">Step {step + 1} of 6</span>
      </div>
      {steps[step]}
    </div>
  );
}

// ── Active View ───────────────────────────────────────────────────────────

interface CampaignStatus {
  totalCalls?: number;
  qualified?: number;
  meetingsBooked?: number;
  avgDuration?: string;
  status?: string;
  recentCalls?: RecentCall[];
}

function ActiveView({ config, setConfig, onEditScript, onEditSchedule, userId }: {
  config: VoiceConfig;
  setConfig: (c: VoiceConfig) => void;
  onEditScript: () => void;
  onEditSchedule: () => void;
  userId: string;
}) {
  const { sendMessage } = useDashboardChat();
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetch(`${RAILWAY_API}/api/campaign/status?userId=${userId}`, {
      headers: { 'x-api-key': RAILWAY_API_KEY },
    })
      .then(r => r.json())
      .then(d => setCampaignStatus(d))
      .catch(() => setCampaignStatus(null))
      .finally(() => setStatusLoading(false));
  }, [userId]);

  const recentCalls: RecentCall[] = (campaignStatus?.recentCalls && campaignStatus.recentCalls.length > 0)
    ? campaignStatus.recentCalls.slice(0, 10)
    : [];

  // Campaign status badge
  const campaignBadge = (() => {
    const s = campaignStatus?.status;
    if (!s || s === 'no_leads') return { label: 'No leads loaded', style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', dot: 'bg-yellow-400' };
    if (s === 'paused') return { label: 'Paused', style: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-400' };
    return { label: 'Active', style: 'bg-green-500/10 text-green-400 border-green-500/20', dot: 'bg-green-400 animate-pulse' };
  })();

  const stats = [
    { label: 'Calls today', value: statusLoading ? '—' : String(campaignStatus?.totalCalls ?? 0), icon: '📞' },
    { label: 'Qualified', value: statusLoading ? '—' : String(campaignStatus?.qualified ?? 0), icon: '✅' },
    { label: 'Meetings booked', value: statusLoading ? '—' : String(campaignStatus?.meetingsBooked ?? 0), icon: '📅' },
    { label: 'Avg duration', value: statusLoading ? '—' : (campaignStatus?.avgDuration ?? '—'), icon: '⏱' },
  ];

  return (
    <div className="flex-1 space-y-6">
      {/* Campaign status banner */}
      <div className="flex items-center justify-between bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${campaignBadge.style}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${campaignBadge.dot}`} />
            {campaignBadge.label}
          </span>
          {campaignStatus?.status === 'no_leads' && (
            <a href="/sales#lead-upload" className="text-xs text-[#D4AF37] hover:underline transition">
              Upload leads →
            </a>
          )}
        </div>
        {statusLoading && <div role="status" aria-label="Loading" className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />}
      </div>

      {/* Campaign stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{stat.label}</span>
              <span>{stat.icon}</span>
            </div>
            <p className="text-2xl font-black text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent calls */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Recent calls</h3>
        </div>
        {statusLoading ? (
          <div className="flex items-center justify-center py-8">
            <div role="status" aria-label="Loading" className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xl">🎙️</div>
            <div>
              <p className="text-white/60 font-semibold text-sm">Sophie hasn&apos;t made any calls yet</p>
              <p className="text-gray-600 text-xs mt-1">Upload leads in Sales to get started</p>
            </div>
            <a
              href="/sales#lead-upload"
              className="text-xs text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1.5 rounded-lg hover:bg-[#D4AF37]/10 transition"
            >
              Upload leads →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {recentCalls.map(call => (
              <div key={call.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-sm flex-shrink-0">
                  {call.leadName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{call.leadName}</p>
                  <p className="text-xs text-gray-600">{call.phone} · {call.time} · {call.duration}</p>
                </div>
                <OutcomeBadge outcome={call.outcome} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onEditScript}
          className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-xl text-sm font-semibold hover:text-white hover:border-[#3a3a3a] transition-colors"
        >
          ✏️ Edit Sophie&apos;s script
        </button>
        <button
          onClick={onEditSchedule}
          className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-xl text-sm font-semibold hover:text-white hover:border-[#3a3a3a] transition-colors"
        >
          🕐 Change call hours
        </button>
        <button
          onClick={() => {
            setConfig({ ...config, active: false });
            safeSend(sendMessage, 'pause sophie');
          }}
          className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/20 transition-colors"
        >
          ⏸ Pause all calls
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

function VoicePageInner() {
  const { user, loading, userProfile } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<VoiceConfig>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  const [editMode, setEditMode] = useState<'none' | 'script' | 'schedule'>('none');
  const [configSaveError, setConfigSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    async function loadConfig() {
      try {
        const db = getFirebaseDb();
        if (!db) { setConfigLoading(false); return; }
        const ref = doc(db, 'users', user!.uid);
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 3000)
        );
        const snap = await Promise.race([getDoc(ref), timeout]);
        if (snap.exists()) {
          const d = snap.data();
          const saved = d?.voiceConfig;
          if (saved) setConfig({ ...DEFAULT_CONFIG, ...saved });
        }
      } catch (err) {
        console.error('[voice] Failed to load config, using defaults', err);
        // Use DEFAULT_CONFIG — already set as initial state
      } finally {
        setConfigLoading(false);
      }
    }
    loadConfig();
  }, [user]);

  const saveConfig = async (newConfig: VoiceConfig) => {
    setConfig(newConfig);
    setConfigSaveError(null);
    if (!user) return;
    try {
      const db = getFirebaseDb();
      if (!db) return;
      const ref = doc(db, 'users', user.uid);
      await setDoc(ref, { voiceConfig: newConfig }, { merge: true });
    } catch (err) {
      console.error('[voice] Failed to save config', err);
      setConfigSaveError('Settings saved locally but failed to sync. Changes may not persist.');
    }
  };

  const handleSetupComplete = async () => {
    await saveConfig({ ...config, setupComplete: true, active: true });
    setEditMode('none');
  };

  const handleToggleActive = async () => {
    await saveConfig({ ...config, active: !config.active });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div role="status" aria-label="Loading" className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const showWizard = !config.setupComplete || editMode !== 'none';
  const userEmail = user.email || '';
  const userName = (userProfile as { name?: string } | null)?.name || user.email?.split('@')[0] || 'User';

  return (
    <DashboardLayout>
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎙️</span>
            <h1 className="text-xl font-black text-white">Voice</h1>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">Sophie AI — outbound calls, lead qualification, meeting booking</p>
        </div>
        <div className="flex items-center gap-3">
          {config.setupComplete && config.active && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-green-500/20 bg-green-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-semibold">Sophie live</span>
            </div>
          )}
        </div>
      </header>

      {configSaveError && (
        <div className="px-8 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-center justify-between">
          <span>⚠️ {configSaveError}</span>
          <button onClick={() => setConfigSaveError(null)} aria-label="Dismiss" className="text-red-400/60 hover:text-red-400 ml-4">×</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-8">
        {configLoading ? (
          <div className="flex items-center justify-center h-64">
            <div role="status" aria-label="Loading" className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <div className="flex gap-6 h-full">
          <LeftPanel config={config} onToggleActive={handleToggleActive} />

          {showWizard ? (
            <SetupWizard
              config={config}
              setConfig={(c) => saveConfig(c)}
              onComplete={handleSetupComplete}
              userEmail={userEmail}
              userName={userName}
              userProfile={userProfile}
              userId={user.uid}
              leadsSource="unknown"
            />
          ) : (
            <ActiveView
              config={config}
              setConfig={(c) => saveConfig(c)}
              onEditScript={() => setEditMode('script')}
              onEditSchedule={() => setEditMode('schedule')}
              userId={user.uid}
            />
          )}
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function VoicePage() {
  return <VoicePageInner />;
}
