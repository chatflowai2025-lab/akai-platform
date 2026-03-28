'use client';

import { useState } from 'react';
import type { ChatMessage } from '@/lib/shared-types';
import ChatBubble from '@/components/ui/ChatBubble';

const INITIAL: ChatMessage = {
  id: '1',
  role: 'assistant',
  content: "Hey! I'm AK — your AI Business Partner. Ask me anything, run a campaign, or check what's working.",
  timestamp: new Date().toISOString(),
};

const SUGGESTED_PROMPTS = [
  "What should I do first?",
  "Run a health check on my site",
  "Show my leads",
  "Connect my email",
];

interface ChatState {
  step: string;
  data: Record<string, string>;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatState, setChatState] = useState<ChatState>({ step: 'business_name', data: {} });

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    const currentInput = input;
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, state: chatState }),
      });
      const data = await res.json();
      if (data.state) {
        setChatState(data.state);
      }
      if (data.message) {
        setMessages(p => [...p, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          buttons: data.buttons,
        }]);
      }
      // Handle redirect action
      if (data.action === 'redirect' && data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error(err);
      setMessages(p => [...p, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, something went wrong. Try again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendButton = async (text: string) => {
    setInput(text);
    // Need to send directly since setInput is async
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(p => [...p, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, state: chatState }),
      });
      const data = await res.json();
      if (data.state) {
        setChatState(data.state);
      }
      if (data.message) {
        setMessages(p => [...p, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          buttons: data.buttons,
        }]);
      }
      if (data.action === 'redirect' && data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error(err);
      setMessages(p => [...p, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, something went wrong. Try again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  return (
    <aside className="w-96 border-l border-[#1f1f1f] flex flex-col bg-[#080808]">
      <div className="px-4 py-3 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs">
            AK
          </div>
          <span className="font-semibold text-sm">Ask AK</span>
          <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id}>
            <ChatBubble message={m} />
            {m.buttons && m.buttons.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 ml-1">
                {m.buttons.map((btn) => (
                  <button
                    key={btn.label}
                    onClick={() => sendButton(btn.label)}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition disabled:opacity-40"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {/* Suggested prompt chips — show after welcome message when chat is idle */}
        {messages.length === 1 && !loading && (
          <div className="flex flex-col gap-2 mt-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendButton(prompt)}
                disabled={loading}
                className="text-left text-xs px-3 py-2 rounded-lg border border-[#1f1f1f] text-gray-400 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition disabled:opacity-40"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        {loading && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            AK is thinking...
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#1f1f1f]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask AK anything..."
            className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition"
          >
            →
          </button>
        </div>
      </div>
    </aside>
  );
}
