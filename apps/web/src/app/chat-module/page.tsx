'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface ChatConfig {
  greeting: string;
  brandColor: string;
  responseStyle: 'Friendly' | 'Professional' | 'Concise';
  enabled: boolean;
}

interface ConversationSession {
  id: string;
  visitorName: string;
  preview: string;
  status: 'Qualified' | 'Browsing' | 'Bounced';
  timestamp: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const DEFAULT_CONFIG: ChatConfig = {
  greeting: "Hi! I'm here to help. What brings you here today?",
  brandColor: '#0a1628',
  responseStyle: 'Friendly',
  enabled: false,
};

// Mock conversations for demo
const MOCK_SESSIONS: ConversationSession[] = [];

export default function ChatModulePage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [savedConfig, setSavedConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null);
  const [sessions] = useState<ConversationSession[]>(MOCK_SESSIONS);

  const embedCode = user
    ? `<script src="https://getakai.ai/widget.js" data-client-id="${user.uid}"></script>`
    : `<script src="https://getakai.ai/widget.js" data-client-id="YOUR_CLIENT_ID"></script>`;

  // Load config from Firestore
  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      const data = snap.data();
      if (data?.chatConfig) {
        const loaded = { ...DEFAULT_CONFIG, ...data.chatConfig };
        setConfig(loaded);
        setSavedConfig(loaded);
      }
    }).catch(() => {});
  }, [user]);

  const saveConfig = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const db = getFirebaseDb();
      if (!db) return;
      await setDoc(doc(db, 'users', user.uid), { chatConfig: config }, { merge: true });
      setSavedConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  }, [user, config]);

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const statusColors: Record<string, string> = {
    Qualified: 'text-green-400 bg-green-400/10',
    Browsing: 'text-yellow-400 bg-yellow-400/10',
    Bounced: 'text-gray-500 bg-gray-500/10',
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(savedConfig);
  const widgetUrl = user
    ? `/chat-widget?clientId=${user.uid}`
    : '/chat-widget?clientId=demo';

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f1f1f] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">💬 Chat Widget</h1>
              <p className="text-sm text-gray-500 mt-0.5">AI-powered lead qualifier for your website</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${savedConfig.enabled ? 'text-green-400 bg-green-400/10' : 'text-gray-500 bg-gray-500/10'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${savedConfig.enabled ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                {savedConfig.enabled ? 'Widget Live' : 'Widget Off'}
              </span>
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── Left Panel: Setup & Config ─────────────────────────────────── */}
          <div className="w-[300px] flex-shrink-0 border-r border-[#1f1f1f] overflow-y-auto bg-[#0a0a0a]">
            <div className="p-4 space-y-4">

              {/* Status card */}
              <div className={`rounded-xl p-4 border ${savedConfig.enabled ? 'border-green-500/20 bg-green-500/5' : 'border-[#1f1f1f] bg-[#111]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Widget Status</span>
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-[#333]'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{ transform: config.enabled ? 'translateX(18px)' : 'translateX(2px)' }} />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {savedConfig.enabled
                    ? 'Your widget is live on all sites using your embed code.'
                    : 'Enable to activate your chat widget.'}
                </p>
              </div>

              {/* Embed code */}
              <div className="rounded-xl border border-[#1f1f1f] bg-[#111] p-4">
                <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">Embed Code</p>
                <p className="text-xs text-gray-500 mb-3">Paste before <code className="text-gray-400">&lt;/body&gt;</code> on your website</p>
                <div className="bg-[#0a0a0a] rounded-lg p-3 mb-3">
                  <code className="text-xs text-green-400 break-all leading-relaxed">{embedCode}</code>
                </div>
                <button
                  onClick={copyEmbed}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-500/20 text-green-400' : 'bg-[#1a1a1a] text-gray-300 hover:text-white hover:bg-[#222]'}`}
                >
                  {copied ? '✓ Copied!' : 'Copy Code'}
                </button>
              </div>

              {/* Widget preview */}
              <div className="rounded-xl border border-[#1f1f1f] bg-[#111] p-4">
                <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wider">Preview</p>
                <div className="rounded-lg overflow-hidden border border-[#1f1f1f]" style={{ height: 280 }}>
                  <iframe
                    src={widgetUrl}
                    className="w-full h-full"
                    title="Widget preview"
                  />
                </div>
              </div>

              {/* Configuration */}
              <div className="rounded-xl border border-[#1f1f1f] bg-[#111] p-4 space-y-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Configuration</p>

                {/* Greeting */}
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Greeting Message</label>
                  <textarea
                    value={config.greeting}
                    onChange={e => setConfig(prev => ({ ...prev, greeting: e.target.value }))}
                    rows={2}
                    className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] resize-none transition-colors"
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
                      className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#D4AF37] transition-colors"
                      placeholder="#0a1628"
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
                            : 'bg-[#0a0a0a] text-gray-400 border border-[#1f1f1f] hover:text-white hover:border-[#333]'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save button */}
                <button
                  onClick={saveConfig}
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
              </div>
            </div>
          </div>

          {/* ── Center Panel: Live Conversations ───────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Sub-header */}
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

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <div className="w-16 h-16 rounded-full bg-[#111] border border-[#1f1f1f] flex items-center justify-center text-3xl mb-4">
                    💬
                  </div>
                  <h3 className="text-white font-semibold mb-2">No conversations yet</h3>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                    Install your widget to start capturing leads. Visitors who chat will appear here in real time.
                  </p>
                  <button
                    onClick={copyEmbed}
                    className="mt-6 px-4 py-2 bg-[#D4AF37] text-black text-sm font-bold rounded-xl hover:opacity-90 transition"
                  >
                    {copied ? '✓ Copied!' : 'Copy Embed Code'}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#1f1f1f]">
                  {sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(selectedSession?.id === session.id ? null : session)}
                      className={`w-full text-left px-6 py-4 hover:bg-[#111] transition-colors ${selectedSession?.id === session.id ? 'bg-[#111] border-l-2 border-[#D4AF37]' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-white">{session.visitorName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[session.status]}`}>
                          {session.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{session.preview}</p>
                      <p className="text-xs text-gray-700 mt-1">{session.timestamp}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel: Selected Conversation ─────────────────────────── */}
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
    </DashboardLayout>
  );
}
