'use client';

import { useState } from 'react';
import type { ChatMessage } from '@akai/shared-types';
import ChatBubble from '@/components/ui/ChatBubble';

const INITIAL: ChatMessage = {
  id: '1',
  role: 'assistant',
  content: "Hi, I'm AK. Ask me anything — run a call campaign, check your pipeline, or just ask what's working.",
  timestamp: new Date().toISOString(),
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, context: 'dashboard' }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages(p => [...p, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          buttons: data.buttons,
        }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="w-96 border-l border-[#1f1f1f] flex flex-col bg-[#080808]">
      <div className="px-4 py-3 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs">
            M
          </div>
          <span className="font-semibold text-sm">Ask AK</span>
          <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => <ChatBubble key={m.id} message={m} />)}
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
