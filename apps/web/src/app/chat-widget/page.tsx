'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// LeadData interface reserved for future lead capture integration
// interface LeadData { name: string; email: string; phone?: string; }

interface ClientConfig {
  businessName: string;
  brandColor: string;
  greeting: string;
}

function ChatWidget() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId') || 'demo';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [capturedName, setCapturedName] = useState('');
  const [config, setConfig] = useState<ClientConfig>({
    businessName: 'us',
    brandColor: '#0a1628',
    greeting: "Hi! I'm AK — your AI Business Partner. What can I help you with today?",
  });
  const [configLoaded, setConfigLoaded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load client config
  useEffect(() => {
    async function loadConfig() {
      try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        if (!projectId || clientId === 'demo') {
          setConfigLoaded(true);
          return;
        }
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${clientId}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const fields = data.fields || {};
          const chatCfg = fields.chatConfig?.mapValue?.fields || {};
          const biz = fields.businessName?.stringValue;
          const color = chatCfg.brandColor?.stringValue;
          const greet = chatCfg.greeting?.stringValue;
          setConfig(prev => ({
            businessName: biz || prev.businessName,
            brandColor: color || prev.brandColor,
            greeting: greet || (biz ? `Hi! I'm ${biz}'s AI assistant. How can I help?` : prev.greeting),
          }));
        }
      } catch {
        // use defaults
      } finally {
        setConfigLoaded(true);
      }
    }
    loadConfig();
  }, [clientId]);

  // Show initial greeting
  useEffect(() => {
    if (!configLoaded) return;
    setMessages([{
      id: '1',
      role: 'assistant',
      content: config.greeting,
    }]);
  }, [configLoaded]); // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || leadCaptured) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat-widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          clientId,
          conversationHistory: history,
        }),
      });

      const data = await res.json();

      if (data.message) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
        }]);
      }

      if (data.leadCaptured && data.leadData) {
        setLeadCaptured(true);
        setCapturedName(data.leadData.name || '');
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading, leadCaptured, messages, clientId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const brandColor = config.brandColor || '#0a1628';

  if (!configLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: brandColor, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white font-sans" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 text-white flex-shrink-0" style={{ backgroundColor: brandColor }}>
        <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-xs font-black text-black">
          AK
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">
            {config.businessName !== 'us' ? `${config.businessName}` : 'AK'}
          </p>
          <p className="text-xs text-white/60 leading-tight">Your AI Business Partner</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white/60">Online now</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 mr-2 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: brandColor }}>
                AI
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
              }`}
              style={m.role === 'user' ? { backgroundColor: brandColor } : {}}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: brandColor }}>
              AI
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <div className="flex gap-1 items-center">
                {[0, 120, 240].map(d => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: brandColor, animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Lead captured success state */}
        {leadCaptured && (
          <div className="flex justify-center mt-4">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center max-w-[85%]">
              <div className="text-green-600 text-lg mb-1">✓</div>
              <p className="text-green-700 text-sm font-medium">
                Thanks{capturedName ? ` ${capturedName.split(' ')[0]}` : ''}!
              </p>
              <p className="text-green-600 text-xs mt-1">
                Someone will be in touch within 60 seconds.
              </p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!leadCaptured && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 bg-white border-t border-gray-100 flex-shrink-0">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={loading}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-300 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ backgroundColor: brandColor }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      )}

      {/* Powered by */}
      <div className="text-center py-2 bg-white border-t border-gray-50">
        <a
          href="https://getakai.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Powered by <span className="font-semibold">AKAI</span>
        </a>
      </div>
    </div>
  );
}

export default function ChatWidgetPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-5 h-5 rounded-full border-2 border-[#0a1628] border-t-transparent animate-spin" />
      </div>
    }>
      <ChatWidget />
    </Suspense>
  );
}
