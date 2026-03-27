'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout, { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

// ── Safe sendMessage wrapper — prevents crash if chat context not ready ────
function safeSend(sendMessage: (t: string) => void, text: string) {
  try { sendMessage(text); } catch { /* chat not ready */ }
}
import { getFirebaseDb } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// ── Types ─────────────────────────────────────────────────────────────────────

type FlowStep =
  | 'scan'          // Step 1: default — no site connected
  | 'scanning'      // loading state
  | 'no-chat'       // Step 2: scan complete, no AI chat found
  | 'has-chat'      // scan complete, AI chat already detected
  | 'connect'       // Step 3: connect site to install
  | 'live';         // Step 4: widget is live

type ConnectMethod = 'wordpress' | 'github' | 'other';

interface ChatConfig {
  greeting: string;
  brandColor: string;
  responseStyle: 'Friendly' | 'Professional' | 'Concise';
  enabled: boolean;
  domain: string;
}

interface ConversationSession {
  id: string;
  visitorName: string;
  preview: string;
  status: 'Qualified' | 'Browsing' | 'Bounced';
  timestamp: string;
  leadCaptured: boolean;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const DEFAULT_CONFIG: ChatConfig = {
  greeting: "Hi! I'm here to help. What brings you here today?",
  brandColor: '#D4AF37',
  responseStyle: 'Friendly',
  enabled: false,
  domain: '',
};

const MOCK_SESSIONS: ConversationSession[] = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function randomConversionLoss(): number {
  return Math.floor(Math.random() * 20) + 68; // 68–87%
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScanStep({
  onScan,
}: {
  onScan: (url: string) => void;
}) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onScan(url.trim());
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🤖</div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Does your website have AI chat?
          </h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Most business websites don&apos;t. Enter your URL and I&apos;ll check.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="yourwebsite.com.au"
              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
              autoFocus
            />
            <button
              type="submit"
              disabled={!url.trim()}
              className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm whitespace-nowrap"
            >
              Scan now
            </button>
          </div>
          <p className="text-xs text-gray-600 text-center">
            No signup needed — we check your public site in seconds
          </p>
        </form>
      </div>
    </div>
  );
}

function ScanningStep({ url }: { url: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🔍</div>
        <p className="text-white font-medium text-lg mb-2">Checking your website...</p>
        <p className="text-gray-500 text-sm">{extractDomain(url)}</p>
      </div>
    </div>
  );
}

function NoChatStep({
  domain,
  conversionLoss,
  onAddChat,
  onBack,
}: {
  domain: string;
  conversionLoss: number;
  onAddChat: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Result card */}
        <div className="bg-[#111] border border-red-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">❌</span>
            <div>
              <p className="text-white font-semibold">No AI chat found on {domain}</p>
              <p className="text-red-400 text-sm mt-0.5">
                You&apos;re missing out on {conversionLoss}% of visitors who leave without enquiring.
              </p>
            </div>
          </div>

          <div className="border-t border-[#1f1f1f] pt-4">
            <p className="text-gray-400 text-sm font-medium mb-3">Here&apos;s what AKAI AI Chat does:</p>
            <ul className="space-y-2">
              {[
                'Responds to visitors instantly — 24/7, even at 2am',
                'Qualifies them as leads automatically',
                'Routes hot leads to Sophie for a callback within 60 seconds',
                'Every conversation logged in your dashboard',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-[#D4AF37] mt-0.5 flex-shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          onClick={onAddChat}
          className="w-full py-4 bg-[#D4AF37] text-black font-bold text-base rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
        >
          Add AI Chat to my site →
        </button>

        <button
          onClick={onBack}
          className="w-full mt-3 py-2 text-gray-600 hover:text-gray-400 text-sm transition"
        >
          ← Try a different URL
        </button>
      </div>
    </div>
  );
}

function HasChatStep({
  domain,
  onConnect,
  onBack,
}: {
  domain: string;
  onConnect: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="bg-[#111] border border-green-500/20 rounded-2xl p-6 mb-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-white font-semibold text-lg mb-2">
            AI chat detected on {domain}
          </p>
          <p className="text-gray-400 text-sm">
            You already have a chat widget. Want to connect it to AKAI instead?
          </p>
          <p className="text-gray-500 text-xs mt-2">
            AKAI handles lead qualification, routing, and CRM sync — most widgets don&apos;t.
          </p>
        </div>

        <button
          onClick={onConnect}
          className="w-full py-4 bg-[#D4AF37] text-black font-bold text-base rounded-xl hover:opacity-90 transition"
        >
          Switch to AKAI AI Chat →
        </button>

        <button
          onClick={onBack}
          className="w-full mt-3 py-2 text-gray-600 hover:text-gray-400 text-sm transition"
        >
          ← Try a different URL
        </button>
      </div>
    </div>
  );
}

function ConnectStep({
  domain,
  onBack,
  onConnected,
}: {
  domain: string;
  onBack: () => void;
  onConnected?: () => void;
}) {
  const { sendMessage } = useDashboardChat();
  const [method, setMethod] = useState<ConnectMethod | null>(null);
  const [wpUrl, setWpUrl] = useState('');
  const [wpPassword, setWpPassword] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleWordPress = () => {
    safeSend(sendMessage, `I want to add AI chat to my WordPress site at ${wpUrl || domain}`);
    setSubmitted(true);
    onConnected?.();
  };

  const handleGitHub = () => {
    safeSend(sendMessage, `I want to add AI chat to my GitHub site — repo: ${ghRepo || domain}`);
    setSubmitted(true);
    onConnected?.();
  };

  const handleOther = () => {
    safeSend(sendMessage, `I want to add AI chat to my website at ${domain} — it's not WordPress or GitHub`);
    setSubmitted(true);
    onConnected?.();
  };

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-white font-bold text-xl mb-3">We&apos;re on it!</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            AKAI is handling the installation for you. Check the chat panel — Sophie will guide you through the next steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-400 text-sm transition mb-4 flex items-center gap-1"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold text-white mb-1">Connect your site</h2>
          <p className="text-gray-500 text-sm">
            Tell us how your site is built — we&apos;ll handle the install for you.
          </p>
        </div>

        {/* Method selector */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(['wordpress', 'github', 'other'] as ConnectMethod[]).map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`py-3 rounded-xl text-sm font-medium border transition-all ${
                method === m
                  ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]'
                  : 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#444]'
              }`}
            >
              {m === 'wordpress' ? '🟦 WordPress' : m === 'github' ? '⬛ GitHub' : '🌐 Other'}
            </button>
          ))}
        </div>

        {/* WordPress */}
        {method === 'wordpress' && (
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-white font-medium mb-1">WordPress install</p>
              <p className="text-gray-500 text-xs">
                Give us your WordPress URL and an app password — AKAI installs the widget automatically via the WP API.
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">WordPress URL</label>
              <input
                type="text"
                value={wpUrl}
                onChange={e => setWpUrl(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                App Password{' '}
                <a
                  href="https://wordpress.org/documentation/article/application-passwords/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#D4AF37]/70 hover:text-[#D4AF37]"
                >
                  (how to get one)
                </a>
              </label>
              <input
                type="password"
                value={wpPassword}
                onChange={e => setWpPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors font-mono"
              />
            </div>
            <button
              onClick={handleWordPress}
              className="w-full py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:opacity-90 transition text-sm"
            >
              Connect WordPress — we&apos;ll handle the rest →
            </button>
          </div>
        )}

        {/* GitHub */}
        {method === 'github' && (
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-white font-medium mb-1">GitHub install</p>
              <p className="text-gray-500 text-xs">
                Give us your repo and a Personal Access Token — AKAI opens a PR to install the widget.
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Repository (owner/repo)</label>
              <input
                type="text"
                value={ghRepo}
                onChange={e => setGhRepo(e.target.value)}
                placeholder="yourname/your-website"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Personal Access Token{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#D4AF37]/70 hover:text-[#D4AF37]"
                >
                  (generate one)
                </a>
              </label>
              <input
                type="password"
                value={ghToken}
                onChange={e => setGhToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors font-mono"
              />
            </div>
            <button
              onClick={handleGitHub}
              className="w-full py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:opacity-90 transition text-sm"
            >
              Connect GitHub — we&apos;ll open a PR →
            </button>
          </div>
        )}

        {/* Other */}
        {method === 'other' && (
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-white font-medium mb-1">Other platforms</p>
              <p className="text-gray-500 text-xs">
                Webflow, Wix, Squarespace, custom build — no problem. Send us access and we&apos;ll handle the installation end to end.
              </p>
            </div>
            <div className="bg-[#0a0a0a] rounded-xl p-4 space-y-2">
              <p className="text-xs text-gray-400 font-medium">What we&apos;ll need:</p>
              {[
                'Editor / admin access to your site builder, OR',
                'FTP/SFTP credentials, OR',
                'CMS login — we handle it securely and don\'t store credentials',
              ].map(item => (
                <div key={item} className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="text-[#D4AF37] mt-0.5">•</span>
                  {item}
                </div>
              ))}
            </div>
            <button
              onClick={handleOther}
              className="w-full py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:opacity-90 transition text-sm"
            >
              Talk to AKAI — let&apos;s sort it →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveStep({
  config,
  setConfig,
  saving,
  saved,
  saveError,
  hasChanges,
  onSave,
  sessions,
  onReset,
}: {
  config: ChatConfig;
  setConfig: React.Dispatch<React.SetStateAction<ChatConfig>>;
  saving: boolean;
  saved: boolean;
  saveError: string | null;
  hasChanges: boolean;
  onSave: () => void;
  sessions: ConversationSession[];
  onReset: () => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null);

  const statusColors: Record<string, string> = {
    Qualified: 'text-green-400 bg-green-400/10',
    Browsing: 'text-yellow-400 bg-yellow-400/10',
    Bounced: 'text-gray-500 bg-gray-500/10',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Live status banner */}
      <div className="px-6 py-3 border-b border-[#1f1f1f] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-green-400 text-lg">✅</span>
            <div>
              <p className="text-white font-semibold text-sm">
                AI Chat is live on {config.domain || 'your site'}
              </p>
              <p className="text-gray-500 text-xs">Capturing leads 24/7</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Pause/resume toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{config.enabled ? 'Live' : 'Paused'}</span>
              <button
                onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-[#333]'}`}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                  style={{ transform: config.enabled ? 'translateX(18px)' : 'translateX(2px)' }}
                />
              </button>
            </div>
            <button
              onClick={() => setShowPreview(true)}
              className="px-3 py-1.5 bg-[#1a1a1a] text-gray-300 hover:text-white border border-[#2a2a2a] rounded-lg text-xs font-medium transition-colors"
            >
              Test your widget
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left: Config panel */}
        <div className="w-[280px] flex-shrink-0 border-r border-[#1f1f1f] overflow-y-auto bg-[#0a0a0a] p-4 space-y-4">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Widget Config</p>

          {/* Greeting */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Greeting Message</label>
            <textarea
              value={config.greeting}
              onChange={e => setConfig(prev => ({ ...prev, greeting: e.target.value }))}
              rows={2}
              className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] resize-none transition-colors"
              placeholder="Hi! How can I help you today?"
            />
          </div>

          {/* Brand color */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Brand Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.brandColor}
                onChange={e => setConfig(prev => ({ ...prev, brandColor: e.target.value }))}
                className="w-9 h-9 rounded-lg border border-[#1f1f1f] bg-transparent cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={config.brandColor}
                onChange={e => setConfig(prev => ({ ...prev, brandColor: e.target.value }))}
                className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#D4AF37] transition-colors"
                placeholder="#D4AF37"
              />
            </div>
          </div>

          {/* Response style */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Response Style</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Friendly', 'Professional', 'Concise'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => setConfig(prev => ({ ...prev, responseStyle: style }))}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    config.responseStyle === style
                      ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                      : 'bg-[#111] text-gray-400 border border-[#1f1f1f] hover:text-white hover:border-[#333]'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={onSave}
            disabled={saving || !hasChanges}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
              saved
                ? 'bg-green-500/20 text-green-400'
                : hasChanges
                  ? 'bg-[#D4AF37] text-black hover:opacity-90'
                  : 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
          {saveError && <p className="text-xs text-red-400 mt-1">{saveError}</p>}

          <div className="pt-2 border-t border-[#1f1f1f]">
            <button
              onClick={onReset}
              className="text-xs text-gray-600 hover:text-gray-400 transition"
            >
              Disconnect site
            </button>
          </div>
        </div>

        {/* Right: Live Conversations */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="px-6 py-3 border-b border-[#1f1f1f] flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-white">Live Conversations</h2>
              <p className="text-xs text-gray-500">{sessions.length} sessions</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Watching for visitors
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
                  <div className="w-16 h-16 rounded-full bg-[#111] border border-[#1f1f1f] flex items-center justify-center text-3xl mb-4">
                    💬
                  </div>
                  <h3 className="text-white font-semibold mb-2">Watching for visitors...</h3>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                    Your first conversation will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#1f1f1f]">
                  {sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(prev => prev?.id === session.id ? null : session)}
                      className={`w-full text-left px-6 py-4 hover:bg-[#111] transition-colors ${selectedSession?.id === session.id ? 'bg-[#111] border-l-2 border-[#D4AF37]' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-white">{session.visitorName}</span>
                        <div className="flex items-center gap-2">
                          {session.leadCaptured && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">Lead</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[session.status]}`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{session.preview}</p>
                      <p className="text-xs text-gray-700 mt-1">{session.timestamp}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Conversation detail panel */}
            {selectedSession && (
              <div className="w-72 flex-shrink-0 border-l border-[#1f1f1f] flex flex-col bg-[#0a0a0a] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedSession.visitorName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[selectedSession.status]}`}>
                      {selectedSession.status}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="text-gray-600 hover:text-white transition-colors text-lg"
                  >
                    ×
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedSession.messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-[#D4AF37] text-black'
                          : 'bg-[#1a1a1a] text-white/80 border border-[#2a2a2a]'
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget preview modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8">
          <div className="bg-[#111] rounded-2xl border border-[#2a2a2a] w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f1f]">
              <p className="text-white font-semibold text-sm">Widget Preview</p>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-white transition-colors text-xl"
              >
                ×
              </button>
            </div>
            <div className="h-80">
              <iframe
                src="/chat-widget?clientId=preview"
                className="w-full h-full"
                title="Widget preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChatModulePage() {
  const { user } = useAuth();
  const [step, setStep] = useState<FlowStep>('scan');
  const [scannedUrl, setScannedUrl] = useState('');
  const [scannedDomain, setScannedDomain] = useState('');
  const [conversionLoss] = useState(randomConversionLoss);

  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [savedConfig, setSavedConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sessions] = useState<ConversationSession[]>(MOCK_SESSIONS);

  // Load config from Firestore
  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      const data = snap.data();
      if (data?.chatConfig) {
        const loaded: ChatConfig = { ...DEFAULT_CONFIG, ...data.chatConfig };
        setConfig(loaded);
        setSavedConfig(loaded);
        // If they've previously connected a site, jump to live
        if (loaded.domain && loaded.enabled !== undefined) {
          setStep('live');
        }
      }
    }).catch(() => {});
  }, [user]);

  const saveConfig = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    try {
      const db = getFirebaseDb();
      if (!db) return;
      await setDoc(doc(db, 'users', user.uid), { chatConfig: config }, { merge: true });
      setSavedConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save config:', err);
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, config]);

  const hasChanges = JSON.stringify(config) !== JSON.stringify(savedConfig);

  const handleScan = (url: string) => {
    const domain = extractDomain(url);
    setScannedUrl(url);
    setScannedDomain(domain);
    setStep('scanning');

    // Simulate scan (always returns "no chat found" for demo)
    setTimeout(() => {
      // Randomly simulate finding a chat widget ~15% of the time
      const hasExisting = Math.random() < 0.15;
      setStep(hasExisting ? 'has-chat' : 'no-chat');
    }, 2200);
  };

  const handleAddChat = () => setStep('connect');

  const handleConnected = () => {
    // Update config with domain, mark enabled, save
    const newConfig: ChatConfig = { ...config, domain: scannedDomain, enabled: true };
    setConfig(newConfig);
    setSavedConfig(newConfig);
    if (user) {
      const db = getFirebaseDb();
      if (db) {
        setDoc(doc(db, 'users', user.uid), { chatConfig: newConfig }, { merge: true }).catch(() => {});
      }
    }
    setStep('live');
  };

  const handleReset = () => {
    setStep('scan');
    setScannedUrl('');
    setScannedDomain('');
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f1f1f] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">💬 AI Chat</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {step === 'live'
                  ? `Capturing leads on ${config.domain || 'your site'}`
                  : 'Turn your website into a 24/7 lead machine'}
              </p>
            </div>
            {step === 'live' && (
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium text-green-400 bg-green-400/10">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {savedConfig.enabled ? 'Widget Live' : 'Widget Paused'}
              </span>
            )}
          </div>
        </div>

        {/* Flow content */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {step === 'scan' && <ScanStep onScan={handleScan} />}
          {step === 'scanning' && <ScanningStep url={scannedUrl} />}
          {step === 'no-chat' && (
            <NoChatStep
              domain={scannedDomain}
              conversionLoss={conversionLoss}
              onAddChat={handleAddChat}
              onBack={handleReset}
            />
          )}
          {step === 'has-chat' && (
            <HasChatStep
              domain={scannedDomain}
              onConnect={handleAddChat}
              onBack={handleReset}
            />
          )}
          {step === 'connect' && (
            <ConnectStep
              domain={scannedDomain}
              onBack={() => setStep('no-chat')}
              onConnected={handleConnected}
            />
          )}
          {step === 'live' && (
            <LiveStep
              config={config}
              setConfig={setConfig}
              saving={saving}
              saved={saved}
              saveError={saveError}
              hasChanges={hasChanges}
              onSave={saveConfig}
              sessions={sessions}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
