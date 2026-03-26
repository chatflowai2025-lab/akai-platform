'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
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

const MOCK_CALLS: RecentCall[] = [
  { id: '1', leadName: 'James Mitchell', phone: '+61412345678', outcome: 'Qualified', duration: '3m 22s', time: '10:14 AM' },
  { id: '2', leadName: 'Sarah Chen', phone: '+61423456789', outcome: 'Not interested', duration: '1m 05s', time: '10:32 AM' },
  { id: '3', leadName: 'David Nguyen', phone: '+61434567890', outcome: 'Voicemail', duration: '0m 28s', time: '11:01 AM' },
  { id: '4', leadName: 'Lisa Thompson', phone: '+61445678901', outcome: 'Qualified', duration: '4m 18s', time: '11:45 AM' },
  { id: '5', leadName: 'Mark Williams', phone: '+61456789012', outcome: 'No answer', duration: '0m 00s', time: '12:03 PM' },
];

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
            onClick={() => sendMessage('Play me a sample Sophie call')}
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

// ── AI Script Suggestions ──────────────────────────────────────────────────

function ScriptStep({ config, setConfig, userProfile, onBack, onNext }: {
  config: VoiceConfig;
  setConfig: (c: VoiceConfig) => void;
  userProfile: unknown;
  onBack: () => void;
  onNext: () => void;
}) {
  const profile = userProfile as { businessName?: string; industry?: string; location?: string; campaignConfig?: { businessName?: string; industry?: string; location?: string } } | null;
  const businessName = profile?.businessName || profile?.campaignConfig?.businessName || 'your business';
  const industry = profile?.industry || profile?.campaignConfig?.industry || 'your industry';
  const location = profile?.campaignConfig?.location || 'your area';

  const [suggestions, setSuggestions] = useState<{ hooks: string[]; questions: string[] } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedHook, setSelectedHook] = useState<string | null>(config.script.hook || null);
  const [selectedQ, setSelectedQ] = useState<string | null>(config.script.qualifyingQuestion || null);

  useEffect(() => {
    // Auto-generate on mount if we have business context
    if (businessName !== 'your business' && !suggestions) generateSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateSuggestions = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate Sophie AI calling script suggestions for this business. Business: "${businessName}". Industry: "${industry}". Location: "${location}".

Return ONLY valid JSON in this exact format:
{
  "hooks": [
    "Hook option 1 — 1-2 sentences about what value you deliver",
    "Hook option 2 — different angle",
    "Hook option 3 — another approach"
  ],
  "questions": [
    "Qualifying question option 1",
    "Qualifying question option 2",
    "Qualifying question option 3"
  ]
}

Hooks should be specific to ${industry} in ${location}. Questions should help qualify if they're a real prospect. Australian English. No filler. Return ONLY the JSON.`,
        }),
      });
      const data = await res.json() as { message?: string };
      if (data.message) {
        const match = data.message.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as { hooks?: string[]; questions?: string[] };
          setSuggestions({ hooks: parsed.hooks || [], questions: parsed.questions || [] });
          // Auto-select first if nothing selected
          if (!selectedHook && parsed.hooks?.[0]) setSelectedHook(parsed.hooks[0]);
          if (!selectedQ && parsed.questions?.[0]) setSelectedQ(parsed.questions[0]);
        }
      }
    } catch { /* use manual input */ }
    finally { setGenerating(false); }
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
          {generating ? <span className="w-3 h-3 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" /> : '✨'} {generating ? 'Writing...' : 'Regenerate'}
        </button>
      </div>

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
}: {
  config: VoiceConfig;
  setConfig: (c: VoiceConfig) => void;
  onComplete: () => void;
  userEmail: string;
  userName: string;
  userProfile?: unknown;
}) {
  const [step, setStep] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [testCallState, setTestCallState] = useState<'idle' | 'calling' | 'done'>('idle');
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
      await fetch(`${RAILWAY_API}/api/campaign/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
        body: JSON.stringify({
          leads: [{ name: userName || 'Test User', phone: testPhone }],
          script,
          userId: userEmail,
          campaignName: 'Sophie Test Call',
        }),
      });
    } catch (err) {
      console.error('[test call]', err);
    } finally {
      setTestCallState('done');
    }
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
                "Hi, is that [Name]? This is Sophie calling from [BusinessName]. I'm reaching out because we help [industry] businesses get more enquiries without the manual follow-up. Do you have 2 minutes?"
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-[11px] font-bold text-blue-400 pt-0.5 flex-shrink-0 w-14">Lead</span>
              <p className="text-sm text-white/80 leading-relaxed">"Sure, what's it about?"</p>
            </div>
            <div className="flex gap-3">
              <span className="text-[11px] font-bold text-[#D4AF37] pt-0.5 flex-shrink-0 w-14">Sophie</span>
              <p className="text-sm text-white/80 leading-relaxed">
                "We automate your inbound lead qualification so your team only talks to people who are ready to buy. Does that sound relevant to what you're working on?"
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
            <span className="text-sm font-bold text-white">Use AKAI's number</span>
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
            <p className="text-xs text-yellow-500/70 mt-1.5">We'll verify this — takes 1–2 business days</p>
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
        <p className="text-gray-500 mt-1 text-sm">Sophie operates within Australian law. Here's how.</p>
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
                Sophie will automatically check every number against Australia's Do Not Call Register before calling. We never call registered numbers.
              </p>
            </div>
          </div>
        </div>

        {/* Consent */}
        <label className="flex items-start gap-4 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5 cursor-pointer group hover:border-[#2a2a2a] transition-colors">
          <div
            onClick={() => setConfig({ ...config, consentConfirmed: !config.consentConfirmed })}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
              config.consentConfirmed ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-[#3a3a3a] group-hover:border-[#5a5a5a]'
            }`}
          >
            {config.consentConfirmed && <span className="text-black text-xs font-black">✓</span>}
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">
            I confirm that the leads I'm calling have either given consent to be contacted, or are business numbers (B2B calls don't require consent under the SPAM Act).
          </p>
        </label>

        {/* Recording */}
        <div className="flex items-center justify-between bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5">
          <div>
            <p className="text-sm font-bold text-white">Record calls for review</p>
            <p className="text-xs text-gray-500 mt-0.5">Listen back to calls to improve Sophie's performance</p>
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
          disabled={!config.consentConfirmed}
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
        <p className="text-gray-500 mt-1 text-sm">Before Sophie calls anyone on your list, she'll call YOU first.</p>
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

          <button
            onClick={fireTestCall}
            disabled={!testPhone}
            className="flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black rounded-xl text-sm font-black hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            📞 Call me now
          </button>
          {isSafeMode(userEmail) && (
            <p className="text-xs text-yellow-500/60">Safe mode active — test call will be simulated</p>
          )}
        </div>
      )}

      {testCallState === 'calling' && (
        <div className="flex items-center gap-3 px-5 py-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            {isSafeMode(userEmail)
              ? <p className="text-sm font-semibold text-blue-300">✅ Test call simulated (Safe Mode)</p>
              : <p className="text-sm font-semibold text-blue-300">Calling {testPhone}…</p>
            }
            <p className="text-xs text-blue-400/60 mt-0.5">Sophie is calling you now. Pick up!</p>
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
            <p className="text-xs text-green-400/70 mt-1">Upload your leads in the Sales module to start calling.</p>
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
                sendMessage(`Update Sophie's script: ${improvementNote}`);
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

function ActiveView({ config, setConfig, onEditScript, onEditSchedule }: {
  config: VoiceConfig;
  setConfig: (c: VoiceConfig) => void;
  onEditScript: () => void;
  onEditSchedule: () => void;
}) {
  const { sendMessage } = useDashboardChat();

  return (
    <div className="flex-1 space-y-6">
      {/* Campaign stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Calls today', value: '12', icon: '📞' },
          { label: 'Qualified', value: '3', icon: '✅' },
          { label: 'Meetings booked', value: '1', icon: '📅' },
          { label: 'Avg duration', value: '2m 45s', icon: '⏱' },
        ].map(stat => (
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
        <div className="space-y-2">
          {MOCK_CALLS.map(call => (
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
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onEditScript}
          className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-xl text-sm font-semibold hover:text-white hover:border-[#3a3a3a] transition-colors"
        >
          ✏️ Edit Sophie's script
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
            sendMessage('pause sophie');
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
        const ref = doc(db, 'users', user!.uid, 'voiceConfig', 'config');
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 5000)
        );
        const snap = await Promise.race([getDoc(ref), timeout]);
        if (snap.exists()) {
          setConfig({ ...DEFAULT_CONFIG, ...(snap.data() as VoiceConfig) });
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
    if (!user) return;
    try {
      const db = getFirebaseDb();
      if (!db) return;
      const ref = doc(db, 'users', user.uid, 'voiceConfig', 'config');
      await setDoc(ref, newConfig);
    } catch (err) {
      console.error('[voice] Failed to save config', err);
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
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
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

      <div className="flex-1 overflow-y-auto p-8">
        {configLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
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
            />
          ) : (
            <ActiveView
              config={config}
              setConfig={(c) => saveConfig(c)}
              onEditScript={() => setEditMode('script')}
              onEditSchedule={() => setEditMode('schedule')}
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
