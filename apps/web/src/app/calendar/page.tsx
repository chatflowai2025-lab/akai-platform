'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, serverTimestamp } from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = 'Call' | 'Meeting' | 'Task' | 'Reminder';
type CalendarView = 'month' | 'week' | 'day' | 'bookings';

interface RawCalApiEvent {
  id?: string;
  summary?: string;
  subject?: string;
  description?: string;
  bodyPreview?: string;
  body?: { content?: string };
  start?: { date?: string; dateTime?: string };
  end?: { dateTime?: string };
}

interface Appointment {
  id: string;
  name: string;
  email: string;
  phone?: string;
  slot?: string;
  status?: string;
  message?: string;
  googleEventId?: string;
  date?: string;
  time?: string;
  notes?: string;
  [key: string]: unknown;
}

interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  type: EventType;
  notes: string;
  inviteViaAk: boolean;
  color: string;
  createdAt?: string;
}

// ─── Mock events (relative to today) ─────────────────────────────────────────

// No mock events — each user sees only their own events from their connected calendar
function getMockEvents(): CalEvent[] {
  return [];
}

const EVENT_COLORS: Record<string, { pill: string; dot: string }> = {
  blue:   { pill: 'bg-blue-500/20 text-blue-300 border-blue-500/30',   dot: 'bg-blue-400' },
  gold:   { pill: 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30', dot: 'bg-[#D4AF37]' },
  green:  { pill: 'bg-green-500/20 text-green-300 border-green-500/30', dot: 'bg-green-400' },
  purple: { pill: 'bg-purple-500/20 text-purple-300 border-purple-500/30', dot: 'bg-purple-400' },
  gray:   { pill: 'bg-gray-500/20 text-gray-300 border-gray-500/30',   dot: 'bg-gray-400' },
};

const TYPE_COLORS: Record<EventType, string> = {
  Call: 'blue',
  Meeting: 'gold',
  Task: 'purple',
  Reminder: 'green',
};

// ─── Add Event Modal ──────────────────────────────────────────────────────────

interface AddEventModalProps {
  initialDate?: string;
  onClose: () => void;
  onSave: (event: Omit<CalEvent, 'id' | 'createdAt'>) => Promise<void>;
}

function AddEventModal({ initialDate, onClose, onSave }: AddEventModalProps) {
  const today = new Date().toISOString().split('T')[0] ?? '';
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate || today);
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [type, setType] = useState<EventType>('Meeting');
  const [notes, setNotes] = useState('');
  const [inviteViaAk, setInviteViaAk] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        date,
        time,
        duration,
        type,
        notes,
        inviteViaAk,
        color: TYPE_COLORS[type] ?? 'blue',
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-white">Add Event</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl leading-none" aria-label="Close">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title"
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Duration (minutes)</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition">
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
              <option value={480}>All day</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Type</label>
            <div className="flex gap-2 flex-wrap">
              {(['Call', 'Meeting', 'Task', 'Reminder'] as EventType[]).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    type === t
                      ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40'
                      : 'bg-[#0a0a0a] text-gray-500 border-[#1f1f1f] hover:text-white hover:border-[#2f2f2f]'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" rows={2}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition resize-none" />
          </div>

          <div className="flex items-center justify-between py-2 px-3 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl">
            <div>
              <p className="text-sm text-white font-medium">Invite via AK</p>
              <p className="text-xs text-gray-500">AK sends a calendar invite by email</p>
            </div>
            <button onClick={() => setInviteViaAk(!inviteViaAk)}
              className={`w-10 h-6 rounded-full transition-colors relative ${inviteViaAk ? 'bg-[#D4AF37]' : 'bg-[#2a2a2a]'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${inviteViaAk ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm font-semibold hover:text-white hover:border-[#3a3a3a] transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!title.trim() || saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black text-sm font-bold hover:opacity-90 transition disabled:opacity-40">
            {saving ? 'Saving…' : 'Save Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Grid (Month View) ───────────────────────────────────────────────

interface CalendarGridProps {
  year: number;
  month: number;
  events: CalEvent[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onAddEvent: (date: string) => void;
}

function CalendarGrid({ year, month, events, selectedDate, onSelectDate, onAddEvent }: CalendarGridProps) {
  const today = new Date().toISOString().split('T')[0] ?? '';
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push(`${year}-${mm}-${dd}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDate = useMemo(() => events.reduce<Record<string, CalEvent[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date]!.push(e);
    return acc;
  }, {}), [events]);

  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-b border-[#1f1f1f]">
        {DOW.map(d => (
          <div key={d} className="text-center text-xs text-gray-500 py-3 font-semibold uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 h-[calc(100%-40px)]">
        {cells.map((dateStr, i) => {
          if (!dateStr) {
            return <div key={`empty-${i}`} className="border-b border-r border-[#1a1a1a] min-h-[100px] bg-[#0a0a0a]/50" />;
          }
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const dayEvents = eventsByDate[dateStr] || [];
          const dayNum = parseInt(dateStr.split('-')[2] ?? '0');

          return (
            <div key={dateStr} onClick={() => onSelectDate(dateStr)}
              className={`border-b border-r border-[#1a1a1a] min-h-[100px] p-2 cursor-pointer transition group relative
                ${isSelected ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20' : 'hover:bg-[#111]'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center
                  ${isToday ? 'bg-[#D4AF37] text-black' : 'text-gray-400 group-hover:text-white'}`}>
                  {dayNum}
                </span>
                <button onClick={e => { e.stopPropagation(); onAddEvent(dateStr); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-[#D4AF37] transition text-xs leading-none w-5 h-5 flex items-center justify-center rounded"
                  title="Add event">
                  +
                </button>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => {
                  const colors = EVENT_COLORS[ev.color] ?? EVENT_COLORS['gray'] ?? { pill: '', dot: '' };
                  return (
                    <div key={ev.id} className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${colors.pill}`} title={ev.title}>
                      {ev.time} {ev.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-500 px-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ events, onAddEvent }: { events: CalEvent[]; onAddEvent: (date: string) => void }) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const todayStr = today.toISOString().split('T')[0] ?? '';

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-b border-[#1f1f1f]">
        {days.map(d => {
          const dateStr = d.toISOString().split('T')[0] ?? '';
          const isToday = dateStr === todayStr;
          return (
            <div key={dateStr} className="text-center py-3 border-r border-[#1a1a1a] last:border-r-0">
              <p suppressHydrationWarning className="text-xs text-gray-500 uppercase">{d.toLocaleDateString('en', { weekday: 'short' })}</p>
              <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-[#D4AF37]' : 'text-white'}`}>{d.getDate()}</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7">
        {days.map(d => {
          const dateStr = d.toISOString().split('T')[0] ?? '';
          const dayEvents = events.filter(e => e.date === dateStr);
          return (
            <div key={dateStr} className="min-h-[400px] border-r border-[#1a1a1a] last:border-r-0 p-2 space-y-1 cursor-pointer hover:bg-[#111] transition group"
              onClick={() => onAddEvent(dateStr)}>
              {dayEvents.map(ev => {
                const colors = EVENT_COLORS[ev.color] ?? EVENT_COLORS['gray'] ?? { pill: '', dot: '' };
                return (
                  <div key={ev.id} className={`text-xs px-2 py-1 rounded border ${colors.pill}`}>
                    <p className="font-semibold truncate">{ev.title}</p>
                    <p className="opacity-70">{ev.time}</p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ events, onAddEvent }: { events: CalEvent[]; onAddEvent: (date: string) => void }) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0] ?? '';
  const dayEvents = useMemo(() => events.filter(e => e.date === todayStr), [events, todayStr]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 suppressHydrationWarning className="text-white font-bold">{today.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        <button onClick={() => onAddEvent(todayStr)}
          className="text-xs px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition">
          + Add event
        </button>
      </div>
      {dayEvents.length === 0 ? (
        <div className="text-center py-16 text-gray-600">No events today. Add one?</div>
      ) : (
        <div className="space-y-3">
          {dayEvents.sort((a, b) => a.time.localeCompare(b.time)).map(ev => {
            const colors = EVENT_COLORS[ev.color] ?? EVENT_COLORS['gray'] ?? { pill: '', dot: '' };
            return (
              <div key={ev.id} className={`p-4 rounded-xl border ${colors.pill}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <p className="font-semibold text-white">{ev.title}</p>
                  <span className="ml-auto text-xs opacity-70">{ev.type}</span>
                </div>
                <p className="text-xs opacity-70">{ev.time} · {ev.duration} min</p>
                {ev.notes && <p className="text-xs mt-2 opacity-60">{ev.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

function DayDetailPanel({
  date, events, onClose, onAddEvent,
}: {
  date: string; events: CalEvent[]; onClose: () => void; onAddEvent: (date: string) => void;
}) {
  const d = new Date(date + 'T12:00:00');
  const dayEvents = events.filter(e => e.date === date).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="w-72 border-l border-[#1f1f1f] flex flex-col bg-[#080808] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
        <div>
          <p suppressHydrationWarning className="text-sm font-bold text-white">
            {(() => { try { return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }); } catch { return ''; } })()}
          </p>
          <p className="text-xs text-gray-500">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onAddEvent(date)}
            className="text-xs px-2.5 py-1 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition">
            + Add
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition" aria-label="Close">×</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {dayEvents.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">No events. Add one?</p>
        ) : (
          dayEvents.map(ev => {
            const colors = EVENT_COLORS[ev.color] ?? EVENT_COLORS['gray'] ?? { pill: '', dot: '' };
            return (
              <div key={ev.id} className={`p-3 rounded-xl border ${colors.pill}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                  <p className="text-sm font-semibold text-white truncate">{ev.title}</p>
                </div>
                <p className="text-xs opacity-70">{ev.time} · {ev.duration < 60 ? `${ev.duration}m` : `${ev.duration / 60}h`}</p>
                <p className="text-xs opacity-50 mt-0.5">{ev.type}</p>
                {ev.notes && <p className="text-xs mt-2 opacity-60 leading-relaxed">{ev.notes}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Connect Calendar Banner ──────────────────────────────────────────────────

function ConnectCalendarBanner({ userId }: { userId: string; onConnected?: (provider: string) => void }) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleGoogleConnect = async () => {
    setConnecting('google');
    setConnectError(null);
    try {
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app'}/api/calendar/oauth-url?userId=${userId}`,
        { headers: { 'x-api-key': 'aiclozr_api_key_2026_prod' } }
      );
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const { url } = await r.json();
      window.location.href = url;
    } catch {
      setConnectError('Could not reach the Google Calendar service. Try again in a moment.');
      setConnecting(null);
    }
  };

  const handleOutlookConnect = async () => {
    setConnecting('outlook');
    setConnectError(null);
    try {
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app'}/api/calendar/ms-auth-url?userId=${userId}`,
        { headers: { 'x-api-key': 'aiclozr_api_key_2026_prod' } }
      );
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const { authUrl } = await r.json() as { authUrl: string };
      window.location.href = authUrl;
    } catch {
      setConnectError('Could not reach the Outlook Calendar service. Try again in a moment.');
      setConnecting(null);
    }
  };

  return (
    <div className="mx-6 mb-4 mt-2">
      <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-lg flex-shrink-0">📅</div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Connect your calendar</p>
            <p className="text-gray-500 text-xs mt-0.5 mb-4">AKAI syncs your calendar and books meetings directly — no back-and-forth.</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGoogleConnect}
                disabled={connecting !== null}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#D4AF37]/50 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                {connecting === 'google' ? 'Connecting…' : 'Google Calendar'}
              </button>
              <button
                onClick={handleOutlookConnect}
                disabled={connecting !== null}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#D4AF37]/50 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                {connecting === 'outlook' ? 'Connecting…' : 'Outlook Calendar'}
              </button>
            </div>
          </div>
        </div>
        {connectError && (
          <p className="text-xs text-red-400 mt-3">{connectError}</p>
        )}
      </div>
    </div>
  );
}

// ─── Bookings View ────────────────────────────────────────────────────────────

function BookingsView({ userId }: { userId: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app'}/api/calendar/appointments/${userId}`, {
      headers: { 'x-api-key': 'aiclozr_api_key_2026_prod' }
    })
      .then(r => r.json())
      .then(d => { setAppointments(d.appointments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><div role="status" aria-label="Loading" className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" /></div>;

  if (appointments.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
      <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#1f1f1f] flex items-center justify-center text-2xl">📭</div>
      <p className="text-white font-semibold text-sm">No bookings yet</p>
      <p className="text-gray-500 text-xs">When leads book via your email CTA, they appear here</p>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-3">
      <h3 className="text-sm font-bold text-white mb-4">📋 Booked appointments</h3>
      {appointments.map((apt: Appointment) => (
        <div key={apt.id} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white font-semibold text-sm">{apt.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">{apt.email}</p>
              {apt.phone && <p className="text-gray-500 text-xs">{apt.phone}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-semibold">
                ✓ Confirmed
              </span>
              <p suppressHydrationWarning className="text-xs text-gray-600 mt-1">
                {apt.slot ? new Date(apt.slot).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Time TBC'}
              </p>
            </div>
          </div>
          {apt.message && <p className="text-xs text-gray-500 mt-2 italic">&ldquo;{apt.message}&rdquo;</p>}
          {apt.googleEventId && <p className="text-xs text-[#D4AF37] mt-1">📅 Added to Google Calendar</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Main Calendar Page ───────────────────────────────────────────────────────

declare global {
  interface Window { __calendarUserId?: string; }
}

function CalendarContent({ user }: { user: { uid: string } }) {
  const today = new Date();
  const [view, setView] = useState<CalendarView>('month');
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalEvent[]>(getMockEvents());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalDate, setModalDate] = useState<string | undefined>(undefined);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  // Initialise from localStorage so badge persists across navigation
  const [calConnected, setCalConnected] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`cal_connected_${user.uid}`) === 'true';
  });
  const [calProvider, setCalProvider] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`cal_provider_${user.uid}`) || null;
  });
  const [copyToast, setCopyToast] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__calendarUserId = user.uid;
    }
  }, [user.uid]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'google') {
      setCalConnected(true);
      setCalProvider('google');
      history.pushState({}, '', window.location.pathname);
    }
    if (params.get('connected') === 'outlook') {
      setCalConnected(true);
      setCalProvider('outlook');
      history.pushState({}, '', window.location.pathname);
    }
  }, []);

  const reloadCalConfig = useCallback(() => {
    const db = getFirebaseDb();
    if (!db) return;
    import('firebase/firestore').then(({ doc, getDoc }) => {
      // Check root user doc first (Railway saves here: googleCalendarConnected / googleRefreshToken)
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          if (d?.googleCalendarConnected || d?.googleRefreshToken) {
            setCalConnected(true);
            setCalProvider('google');
            return;
          }
          // Check Microsoft calendar connected (check all possible indicators)
          if (d?.microsoftCalendarConnected === true || 
              d?.inboxConnection?.provider === 'microsoft' ||
              d?.microsoftCalendarEmail) {
            setCalConnected(true);
            setCalProvider('outlook');
            return;
          }
        }
        // Fallback: check integrations sub-doc
        getDoc(doc(db, 'users', user.uid, 'integrations', 'googleCalendar')).then(snap2 => { // schema-drift-ok: legacy fallback sub-doc — raw path intentional, no schema helper for subcollection doc refs (FIRESTORE_SCHEMA.md)
          if (snap2.exists()) {
            const d = snap2.data();
            if (d?.connected || d?.accessToken) {
              setCalConnected(true);
              setCalProvider('google');
            }
          }
        }).catch(() => {});
      }).catch(() => {});
    });
  }, [user.uid]);

  // Persist connection state to localStorage so it survives navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (calConnected && calProvider) {
      localStorage.setItem(`cal_connected_${user.uid}`, 'true');
      localStorage.setItem(`cal_provider_${user.uid}`, calProvider);
    } else if (!calConnected) {
      localStorage.removeItem(`cal_connected_${user.uid}`);
      localStorage.removeItem(`cal_provider_${user.uid}`);
    }
  }, [calConnected, calProvider, user.uid]);

  useEffect(() => {
    if (!calConnected || calProvider !== 'google') return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app'}/api/calendar/list?userId=${user.uid}&days=30`, {
      headers: { 'x-api-key': 'aiclozr_api_key_2026_prod' }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.events?.length) return;
        const gcalEvents: CalEvent[] = data.events.map((e: RawCalApiEvent) => ({
          id: e.id || `gcal-${Math.random()}`,
          title: e.summary || '(No title)',
          date: (e.start?.date || e.start?.dateTime || '').slice(0, 10),
          time: e.start?.dateTime ? new Date(e.start.dateTime).toTimeString().slice(0, 5) : '00:00',
          duration: e.end?.dateTime && e.start?.dateTime
            ? Math.round((new Date(e.end.dateTime).getTime() - new Date(e.start.dateTime).getTime()) / 60000)
            : 60,
          type: 'Meeting' as EventType,
          notes: e.description || '',
          inviteViaAk: false,
          color: 'blue',
        })).filter((e: CalEvent) => e.date);
        setEvents(prev => {
          const ids = new Set(prev.map(e => e.id));
          return [...prev, ...gcalEvents.filter((e: CalEvent) => !ids.has(e.id))];
        });
      })
      .catch(() => {});
  }, [calConnected, calProvider, user.uid]);

  useEffect(() => {
    if (!calConnected || calProvider !== 'outlook') return;

    // Fetch Outlook calendar events via Railway API
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app'}/api/calendar/outlook-events?userId=${user.uid}&days=30`, {
      headers: { 'x-api-key': 'aiclozr_api_key_2026_prod' }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.events?.length) return;
        const outlookEvents: CalEvent[] = data.events.map((e: RawCalApiEvent) => ({
          id: e.id || `outlook-${Math.random()}`,
          title: e.subject || '(No title)',
          date: (e.start?.dateTime || e.start?.date || '').slice(0, 10),
          time: e.start?.dateTime ? new Date(e.start.dateTime).toTimeString().slice(0, 5) : '00:00',
          duration: e.end?.dateTime && e.start?.dateTime
            ? Math.round((new Date(e.end.dateTime).getTime() - new Date(e.start.dateTime).getTime()) / 60000)
            : 60,
          type: 'Meeting' as EventType,
          notes: e.body?.content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) || e.bodyPreview || '',
          inviteViaAk: false,
          color: 'blue',
        })).filter((e: CalEvent) => e.date);
        setEvents(prev => {
          const ids = new Set(prev.map(e => e.id));
          return [...prev, ...outlookEvents.filter((e: CalEvent) => !ids.has(e.id))];
        });
      })
      .catch(() => {});
  }, [calConnected, calProvider, user.uid]);

  useEffect(() => {
    reloadCalConfig();
    const db = getFirebaseDb();
    if (!db) return;

    getDocs(collection(db, 'users', user.uid, 'events')).then(snap => {
      if (snap.empty) return;
      const firestoreEvents: CalEvent[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as CalEvent));
      setEvents(prev => {
        const ids = new Set(prev.map(e => e.id));
        return [...prev, ...firestoreEvents.filter(e => !ids.has(e.id))];
      });
    }).catch(() => {});
  }, [user.uid, reloadCalConfig]);

  const handleAddEvent = async (eventData: Omit<CalEvent, 'id' | 'createdAt'>) => {
    const db = getFirebaseDb();
    const id = `evt-${Date.now()}`;
    const newEvent: CalEvent = { ...eventData, id, createdAt: new Date().toISOString() };
    setEvents(prev => [...prev, newEvent]);

    // Navigate to the event's month/year so it's immediately visible
    const evDate = new Date(eventData.date);
    if (!isNaN(evDate.getTime())) {
      setCurrentYear(evDate.getFullYear());
      setCurrentMonth(evDate.getMonth());
      setSelectedDate(eventData.date);
    }

    // Show success toast
    setSaveToast(`✅ "${eventData.title}" saved`);
    setTimeout(() => setSaveToast(null), 3000);

    if (db) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'events', id), {
          ...eventData,
          createdAt: serverTimestamp(),
        });
      } catch {
        // non-fatal — event already in local state
      }
    }
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(prev => prev === date ? null : date);
  };

  const openAddModal = useCallback((date?: string) => {
    setModalDate(date);
    setShowAddModal(true);
  }, []);

  const monthName = (() => { try { return new Date(currentYear, currentMonth).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }); } catch { return `${currentYear}`; } })();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-[#080808] flex-shrink-0">
        <div>
          <h1 className="text-xl font-black text-white">📅 Calendar</h1>
          <p className="text-xs text-gray-500 mt-0.5">Schedule, manage, and stay on top of everything</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connected badge + disconnect */}
          {calConnected && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-green-400 font-semibold capitalize">{calProvider} connected</span>
              </div>
              <button
                onClick={async () => {
                  if (!confirm('Disconnect calendar?')) return;
                  const endpoint = calProvider === 'outlook'
                    ? `${process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app'}/api/email/microsoft/disconnect`
                    : `${process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app'}/api/calendar/disconnect`;
                  await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': 'aiclozr_api_key_2026_prod' },
                    body: JSON.stringify({ userId: user.uid }),
                  }).catch(() => {});
                  setCalConnected(false);
                  setCalProvider(null);
                }}
                className="text-xs text-gray-600 hover:text-red-400 transition px-2 py-1.5 rounded-lg border border-[#1f1f1f] hover:border-red-500/30"
              >
                Disconnect
              </button>
            </div>
          )}
          {/* Booking link copy button */}
          <button
            onClick={() => {
              const url = `https://getakai.ai/book/${user.uid}?biz=${encodeURIComponent('Your Business')}`;
              navigator.clipboard.writeText(url).then(() => {
                setCopyToast(true);
                setTimeout(() => setCopyToast(false), 2000);
              });
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#1f1f1f] text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition"
            title="Copy your booking page link"
          >
            {copyToast ? '✅ Copied!' : '🔗 Copy booking link'}
          </button>
          {/* Add event */}
          <button
            onClick={() => openAddModal()}
            className="px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition"
          >
            + Add Event
          </button>
          {/* View toggle */}
          <div className="flex bg-[#111] border border-[#1f1f1f] rounded-xl p-0.5">
            {(['month', 'week', 'day'] as CalendarView[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  view === v ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'
                }`}>
                {v}
              </button>
            ))}
            <button onClick={() => setView('bookings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                view === 'bookings' ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'
              }`}>
              📋
            </button>
          </div>
        </div>
      </header>

      {/* Connect banner — shown when not connected, above the calendar */}
      {!calConnected && (
        <ConnectCalendarBanner userId={user.uid} onConnected={(provider) => { setCalConnected(true); setCalProvider(provider); }} />
      )}

      {/* Calendar area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {(view === 'month' || view === 'week') && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] flex-shrink-0">
              <button onClick={prevMonth} aria-label="Previous month" className="text-gray-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-[#1a1a1a]">‹</button>
              <h2 suppressHydrationWarning className="text-sm font-bold text-white">{monthName}</h2>
              <button onClick={nextMonth} aria-label="Next month" className="text-gray-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-[#1a1a1a]">›</button>
            </div>
          )}

          {view === 'month' && (
            <CalendarGrid
              year={currentYear}
              month={currentMonth}
              events={events}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onAddEvent={date => openAddModal(date)}
            />
          )}
          {view === 'week' && (
            <WeekView events={events} onAddEvent={date => openAddModal(date)} />
          )}
          {view === 'day' && (
            <DayView events={events} onAddEvent={date => openAddModal(date)} />
          )}
          {view === 'bookings' && (
            <BookingsView userId={user.uid} />
          )}
        </div>

        {/* Day detail panel */}
        {selectedDate && view === 'month' && (
          <DayDetailPanel
            date={selectedDate}
            events={events}
            onClose={() => setSelectedDate(null)}
            onAddEvent={date => openAddModal(date)}
          />
        )}
      </div>

      {showAddModal && (
        <AddEventModal
          initialDate={modalDate}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddEvent}
        />
      )}

      {/* Save success toast */}
      {saveToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#1a1a1a] border border-green-500/40 text-green-300 text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl animate-fade-in">
          {saveToast}
        </div>
      )}
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

function CalendarPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div role="status" aria-label="Loading" className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <CalendarContent user={user} />
    </DashboardLayout>
  );
}

export default CalendarPage;
