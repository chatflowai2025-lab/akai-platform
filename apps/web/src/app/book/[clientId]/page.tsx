'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const RAILWAY = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

const FALLBACK_TIMES = [
  { label: '9:00 am', value: '09:00' },
  { label: '11:00 am', value: '11:00' },
  { label: '2:00 pm', value: '14:00' },
];

interface SlotData {
  start: string;
  end: string;
}

interface SelectedSlot {
  start: string;
  end: string;
  label: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface BookingForm {
  name: string;
  email: string;
  phone: string;
  message: string;
}

// ─── AKAI Chat Column ─────────────────────────────────────────────────────────
function ChatColumn({ clientId, bizName }: { clientId: string; bizName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: `Hi! I'm AK, the AI assistant for ${bizName}. How can I help you today? Ask me anything about what we offer, pricing, availability, or how we can help your business. 👋`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch(`${RAILWAY}/api/chat/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          message: text,
          userId: clientId,
          sessionId: `public-${clientId}`,
        }),
      });

      if (!res.ok) throw new Error('Chat error');
      const data = await res.json() as { reply?: string };
      const reply = data.reply || "I'm here to help — what would you like to know?";
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: "I'm having trouble connecting right now. Please try again in a moment, or use the booking form on the right to schedule a call.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] rounded-2xl border border-[#1f1f1f] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <p className="text-white font-bold text-sm">Chat with AK</p>
            <p className="text-gray-500 text-xs">Ask anything about {bizName}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#D4AF37] text-black font-medium rounded-br-sm'
                  : 'bg-[#161616] border border-[#2a2a2a] text-gray-200 rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#161616] border border-[#2a2a2a] px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
              <span className="text-gray-400 text-xs">AK is thinking</span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1 h-1 bg-[#D4AF37] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#1f1f1f]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything…"
            disabled={loading}
            className="flex-1 bg-[#161616] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="px-4 py-2.5 bg-[#D4AF37] text-black font-bold rounded-xl text-sm hover:opacity-90 transition disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Column ───────────────────────────────────────────────────────────
function BookingColumn({ clientId, bizName }: { clientId: string; bizName: string }) {
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [form, setForm] = useState<BookingForm>({ name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate 7-day date range
  const weekDates = (() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  })();

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch(
          `${RAILWAY}/api/calendar/availability?userId=${clientId}`,
          { headers: { 'x-api-key': API_KEY } }
        );
        if (!res.ok) throw new Error('API error');
        const data = await res.json() as { slots?: SlotData[] };
        setSlots(data.slots || []);
      } catch {
        // Fall back to hardcoded slots — set empty so we generate from weekDates
        setSlots([]);
      } finally {
        setSlotsLoaded(true);
      }
    };
    fetchSlots();
  }, [clientId]);

  // Build slot grid — use real API slots or generate fallback
  const getSlotForDate = (date: Date, time: { label: string; value: string }): SlotData | null => {
    const parts = time.value.split(':').map(Number);
    const h = parts[0] ?? 9;
    const m = parts[1] ?? 0;
    const slotDate = new Date(date);
    slotDate.setHours(h, m, 0, 0);

    if (slots.length > 0) {
      // Find matching real slot
      return slots.find(s => {
        const sd = new Date(s.start);
        return sd.getFullYear() === slotDate.getFullYear() &&
          sd.getMonth() === slotDate.getMonth() &&
          sd.getDate() === slotDate.getDate() &&
          sd.getHours() === h &&
          sd.getMinutes() === m;
      }) || null;
    }

    // Fallback: all weekday slots available
    const dow = date.getDay();
    if (dow === 0 || dow === 6) return null;
    return {
      start: slotDate.toISOString(),
      end: new Date(slotDate.getTime() + 30 * 60_000).toISOString(),
    };
  };

  const handleSlotClick = (date: Date, time: { label: string; value: string }, slot: SlotData) => {
    const dateStr = date.toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
    setSelectedSlot({ ...slot, label: `${dateStr} at ${time.label} AEST` });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please enter your name and email.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${RAILWAY}/api/calendar/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          clientId,
          businessName: bizName,
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: form.message,
          slot: selectedSlot.start,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error || 'Booking failed');
      }

      setBooked(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (booked) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0d0d0d] rounded-2xl border border-[#1f1f1f] p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-white font-black text-xl mb-2">You&apos;re booked in!</h3>
        <p className="text-gray-400 text-sm mb-4">
          Confirmation will be sent to <span className="text-white">{form.email}</span>
        </p>
        {selectedSlot && (
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl px-4 py-3">
            <p className="text-[#D4AF37] font-semibold text-sm">{selectedSlot.label}</p>
          </div>
        )}
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col bg-[#0d0d0d] rounded-2xl border border-[#1f1f1f] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <span className="text-xl">📅</span>
          <div>
            <p className="text-white font-bold text-sm">Book a time</p>
            <p className="text-gray-500 text-xs">with {bizName}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* 7-day slot grid */}
        {!slotsLoaded ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-1 min-w-[350px]">
              {weekDates.map((date, i) => {
                const dayLabel = date.toLocaleDateString('en-AU', { weekday: 'short' });
                const dayNum = date.getDate();
                const isPastDay = date < today;

                return (
                  <div key={i} className="text-center">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">
                      {dayLabel}
                    </p>
                    <p className="text-xs text-gray-600 mb-1.5">{dayNum}</p>
                    <div className="flex flex-col gap-1">
                      {FALLBACK_TIMES.map(time => {
                        const slot = !isPastDay ? getSlotForDate(date, time) : null;
                        const isSelected = selectedSlot?.start === slot?.start;
                        const available = !!slot;

                        return (
                          <button
                            key={time.value}
                            onClick={() => slot && handleSlotClick(date, time, slot)}
                            disabled={!available}
                            className={`w-full py-1.5 px-0.5 rounded-lg text-[10px] font-semibold transition ${
                              isSelected
                                ? 'bg-[#D4AF37] text-black'
                                : available
                                ? 'bg-[#111] border border-[#2a2a2a] text-gray-300 hover:border-[#D4AF37]/50 hover:text-white'
                                : 'bg-[#0d0d0d] text-[#333] cursor-not-allowed'
                            }`}
                          >
                            {available ? time.label : '—'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected slot pill */}
        {selectedSlot && (
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 text-center">
            <p className="text-[#D4AF37] font-semibold text-xs">{selectedSlot.label}</p>
          </div>
        )}

        {/* Booking form — shows after slot selection */}
        {selectedSlot && (
          <form onSubmit={handleSubmit} className="space-y-3 pt-1 border-t border-[#1f1f1f]">
            <p className="text-white text-xs font-bold pt-1">Your details</p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Name *</label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Phone <span className="text-gray-700">(opt)</span></label>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+61 400 000 000"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Email *</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Message <span className="text-gray-700">(opt)</span></label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Anything you'd like us to know…"
                rows={2}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition resize-none"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#D4AF37] text-black font-bold rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {submitting ? 'Booking…' : 'Confirm booking →'}
            </button>
          </form>
        )}

        {!selectedSlot && slotsLoaded && (
          <p className="text-center text-gray-600 text-xs pb-2">
            ⬆️ Select a time to continue
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main page content (uses useSearchParams) ─────────────────────────────────
function BookPageContent({ clientId }: { clientId: string }) {
  const searchParams = useSearchParams();
  const rawBiz = searchParams.get('biz');
  const bizName = rawBiz ? decodeURIComponent(rawBiz) : 'Our Team';

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center gap-4">
          {/* AKAI Wordmark */}
          <div className="flex items-center gap-1.5">
            <span className="text-white font-black text-xl tracking-tight">AK</span>
            <span className="text-[#D4AF37] font-black text-xl tracking-tight">AI</span>
          </div>
          <div className="w-px h-6 bg-[#2a2a2a]" />
          <span className="text-white font-semibold text-sm">{bizName}</span>
          <div className="ml-auto text-gray-500 text-xs hidden sm:block">
            How can we help you today?
          </div>
        </div>
        {/* Mobile tagline */}
        <p className="text-gray-500 text-xs mt-2 sm:hidden">How can we help you today?</p>
      </div>

      {/* Two-column layout */}
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: '600px' }}>
          {/* Left — Chat */}
          <div className="flex-1 flex flex-col" style={{ minHeight: '500px' }}>
            <ChatColumn clientId={clientId} bizName={bizName} />
          </div>

          {/* Gold divider — desktop only */}
          <div className="hidden lg:flex flex-col items-center">
            <div className="w-px flex-1 bg-gradient-to-b from-transparent via-[#D4AF37]/30 to-transparent" />
          </div>

          {/* Right — Booking */}
          <div className="flex-1">
            <BookingColumn clientId={clientId} bizName={bizName} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-700 mt-8">
        Powered by{' '}
        <a href="https://getakai.ai" className="text-gray-600 hover:text-gray-400 transition">
          AKAI
        </a>
      </p>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────
export default function BookingPage({ params }: { params: { clientId: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BookPageContent clientId={params.clientId} />
    </Suspense>
  );
}
