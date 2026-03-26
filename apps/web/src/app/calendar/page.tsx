'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, serverTimestamp } from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = 'Call' | 'Meeting' | 'Task' | 'Reminder';
type CalendarView = 'month' | 'week' | 'day';

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

function getMockEvents(): CalEvent[] {
  const today = new Date();
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r.toISOString().split('T')[0];
  };

  const daysUntilTue = (2 - today.getDay() + 7) % 7 || 7;
  const daysUntilFri = (5 - today.getDay() + 7) % 7 || 7;
  const daysUntilMon = (1 - today.getDay() + 7) % 7 || 7;

  return [
    {
      id: 'mock-1',
      title: 'Sophie AI calls',
      date: today.toISOString().split('T')[0],
      time: '09:00',
      duration: 480,
      type: 'Call',
      notes: 'Recurring daily — 9am to 5pm outbound calling',
      inviteViaAk: false,
      color: 'blue',
    },
    {
      id: 'mock-2',
      title: 'Marco — AP Heritage',
      date: addDays(today, daysUntilTue),
      time: '10:00',
      duration: 60,
      type: 'Meeting',
      notes: 'AP Heritage campaign review with Marco',
      inviteViaAk: false,
      color: 'gold',
    },
    {
      id: 'mock-3',
      title: 'Will — SHE review',
      date: addDays(today, daysUntilFri),
      time: '14:00',
      duration: 45,
      type: 'Meeting',
      notes: 'SHE campaign performance review with Will',
      inviteViaAk: false,
      color: 'green',
    },
    {
      id: 'mock-4',
      title: 'AKAI team sync',
      date: addDays(today, daysUntilMon),
      time: '09:00',
      duration: 30,
      type: 'Meeting',
      notes: 'Weekly team alignment — all modules',
      inviteViaAk: false,
      color: 'purple',
    },
  ];
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
  const today = new Date().toISOString().split('T')[0];
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
        color: TYPE_COLORS[type],
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
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl leading-none">×</button>
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
  const today = new Date().toISOString().split('T')[0];
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

  const eventsByDate = events.reduce<Record<string, CalEvent[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});

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
          const dayNum = parseInt(dateStr.split('-')[2]);

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
                  const colors = EVENT_COLORS[ev.color] || EVENT_COLORS.gray;
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

  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-b border-[#1f1f1f]">
        {days.map(d => {
          const dateStr = d.toISOString().split('T')[0];
          const isToday = dateStr === todayStr;
          return (
            <div key={dateStr} className="text-center py-3 border-r border-[#1a1a1a] last:border-r-0">
              <p className="text-xs text-gray-500 uppercase">{d.toLocaleDateString('en', { weekday: 'short' })}</p>
              <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-[#D4AF37]' : 'text-white'}`}>{d.getDate()}</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7">
        {days.map(d => {
          const dateStr = d.toISOString().split('T')[0];
          const dayEvents = events.filter(e => e.date === dateStr);
          return (
            <div key={dateStr} className="min-h-[400px] border-r border-[#1a1a1a] last:border-r-0 p-2 space-y-1 cursor-pointer hover:bg-[#111] transition group"
              onClick={() => onAddEvent(dateStr)}>
              {dayEvents.map(ev => {
                const colors = EVENT_COLORS[ev.color] || EVENT_COLORS.gray;
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
  const todayStr = today.toISOString().split('T')[0];
  const dayEvents = events.filter(e => e.date === todayStr);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold">{today.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
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
            const colors = EVENT_COLORS[ev.color] || EVENT_COLORS.gray;
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
          <p className="text-sm font-bold text-white">
            {d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          <p className="text-xs text-gray-500">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onAddEvent(date)}
            className="text-xs px-2.5 py-1 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition">
            + Add
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">×</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {dayEvents.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">No events. Add one?</p>
        ) : (
          dayEvents.map(ev => {
            const colors = EVENT_COLORS[ev.color] || EVENT_COLORS.gray;
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

function ConnectCalendarBanner({ userId, onConnected }: { userId: string; onConnected: (provider: string) => void }) {
  const [connecting, setConnecting] = useState(false);

  const handleGoogleConnect = async () => {
    setConnecting(true);
    try {
      const r = await fetch(
        `https://api-server-production-2a27.up.railway.app/api/calendar/google/auth-url?userId=${userId}`,
        { headers: { 'x-api-key': 'aiclozr_api_key_2026_prod' } }
      );
      const { url } = await r.json();
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  };

  return (
    <div className="flex justify-center px-6 pb-4">
      <div className="w-full max-w-xl bg-[#111] border border-[#D4AF37]/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="text-3xl">📅</div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-white font-bold">Connect your calendar to see real events here</p>
          <p className="text-gray-500 text-sm mt-0.5">Sync Google or Outlook — your mock events will be replaced with real ones.</p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={handleGoogleConnect}
            disabled={connecting}
            className="px-4 py-2 rounded-xl bg-white text-[#1a1a1a] text-sm font-bold hover:bg-gray-100 transition disabled:opacity-60 whitespace-nowrap"
          >
            {connecting ? 'Connecting…' : '🔗 Connect with Google'}
          </button>
        </div>
      </div>
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
  const [calConnected, setCalConnected] = useState(false);
  const [calProvider, setCalProvider] = useState<string | null>(null);

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
  }, []);

  const reloadCalConfig = useCallback(() => {
    const db = getFirebaseDb();
    if (!db) return;
    import('firebase/firestore').then(({ doc, getDoc }) => {
      getDoc(doc(db, 'users', user.uid, 'integrations', 'googleCalendar')).then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          if (d?.connected) {
            setCalConnected(true);
            setCalProvider('google');
          }
        }
      }).catch(() => {});
    });
  }, [user.uid]);

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

    if (db) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'events', id), {
          ...eventData,
          createdAt: serverTimestamp(),
        });
      } catch {
        // non-fatal
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
          {/* Connected badge */}
          {calConnected && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-semibold capitalize">{calProvider} connected</span>
            </div>
          )}
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
              <button onClick={prevMonth} className="text-gray-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-[#1a1a1a]">‹</button>
              <h2 className="text-sm font-bold text-white">{monthName}</h2>
              <button onClick={nextMonth} className="text-gray-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-[#1a1a1a]">›</button>
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
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
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
