'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const RAILWAY = 'https://api-server-production-2a27.up.railway.app';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = [
  { label: '9:00 am', value: '09:00' },
  { label: '11:00 am', value: '11:00' },
  { label: '2:00 pm', value: '14:00' },
];

interface SelectedSlot {
  day: string;
  time: string;
  label: string;
}

interface BookingForm {
  name: string;
  email: string;
  phone: string;
  message: string;
}

function BookingContent({ clientId }: { clientId: string }) {
  const searchParams = useSearchParams();
  const bizName = searchParams.get('biz') ? decodeURIComponent(searchParams.get('biz')!) : 'Our Team';

  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [form, setForm] = useState<BookingForm>({ name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate 7 days starting from this week's Monday
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun,1=Mon,...
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    setWeekDates(dates);
  }, []);

  const handleSlotClick = (dayLabel: string, date: Date, time: { label: string; value: string }) => {
    const dateStr = date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    setSelectedSlot({ day: dayLabel, time: time.value, label: `${dateStr} at ${time.label}` });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please fill in your name and email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${RAILWAY}/api/calendar/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          businessName: bizName,
          slot: selectedSlot,
          ...form,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error || 'Booking failed');
      }
      setBooked(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (booked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-black text-white mb-3">You&apos;re booked in!</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            We&apos;ll send a confirmation to <span className="text-white font-semibold">{form.email}</span>.<br />
            We look forward to speaking with you.
          </p>
          <div className="mt-6 bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
            <p className="text-[#D4AF37] font-semibold text-sm">{selectedSlot?.label}</p>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white">{bizName}</h1>
          <p className="text-gray-400 text-sm mt-2">Pick a time that works for you</p>
        </div>

        {/* Slot grid */}
        <div className="overflow-x-auto mb-8">
          <div className="grid grid-cols-7 gap-1 min-w-[420px]">
            {DAYS.map((day, i) => (
              <div key={day} className="text-center">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">{day}</p>
                {weekDates[i] && (
                  <p className="text-xs text-gray-600 mb-2">{weekDates[i].getDate()}</p>
                )}
                <div className="flex flex-col gap-1">
                  {TIMES.map(time => {
                    const isSelected = selectedSlot?.day === day && selectedSlot?.time === time.value;
                    const isPast = weekDates[i] ? weekDates[i] < today : false;
                    return (
                      <button
                        key={time.value}
                        onClick={() => !isPast && weekDates[i] && handleSlotClick(day, weekDates[i], time)}
                        disabled={isPast}
                        className={`w-full py-2 px-1 rounded-lg text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-[#D4AF37] text-black'
                            : isPast
                            ? 'bg-[#111] text-gray-700 cursor-not-allowed'
                            : 'bg-[#111] border border-[#1f1f1f] text-gray-300 hover:border-[#D4AF37]/50 hover:text-white'
                        }`}
                      >
                        {time.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected slot summary */}
        {selectedSlot && (
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl px-4 py-3 mb-6 text-center">
            <p className="text-[#D4AF37] font-semibold text-sm">
              Selected: {selectedSlot.label}
            </p>
          </div>
        )}

        {/* Booking form */}
        {selectedSlot && (
          <form onSubmit={handleSubmit} className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white">Your details</h2>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Phone <span className="text-gray-700">(optional)</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+61 400 000 000"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Message <span className="text-gray-700">(optional)</span>
              </label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Anything you'd like us to know before the call…"
                rows={3}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition resize-none"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#D4AF37] text-black font-bold rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {submitting ? 'Booking…' : 'Confirm booking →'}
            </button>
          </form>
        )}

        {!selectedSlot && (
          <p className="text-center text-gray-600 text-sm mt-4">⬆️ Select a time above to continue</p>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-700 mt-10">
          Powered by{' '}
          <a href="https://getakai.ai" className="text-gray-600 hover:text-gray-400 transition">
            AKAI
          </a>
        </p>
      </div>
    </div>
  );
}

export default function BookingPage({ params }: { params: { clientId: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BookingContent clientId={params.clientId} />
    </Suspense>
  );
}
