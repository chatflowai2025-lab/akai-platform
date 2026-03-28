'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface PlatformPost {
  platform: string;
  icon: string;
  content: string;
  hashtags: string;
  characterCount: number;
}

interface ScheduledPost {
  id: string;
  platform: string;
  icon: string;
  content: string;
  scheduledAt: string; // ISO string, empty = draft
  status: 'Draft' | 'Scheduled' | 'Posted';
}

const LS_KEY = 'akai_scheduled_posts';

function loadScheduledPosts(): ScheduledPost[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as ScheduledPost[]) : [];
  } catch {
    return [];
  }
}

function saveScheduledPosts(posts: ScheduledPost[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(posts));
  } catch {
    // silent
  }
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸', color: 'from-pink-500 to-purple-500' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: 'from-blue-600 to-blue-400' },
  { id: 'facebook', label: 'Facebook', icon: '👥', color: 'from-blue-500 to-indigo-500' },
  { id: 'x', label: 'X (Twitter)', icon: '𝕏', color: 'from-gray-200 to-gray-400' },
];

const CHAR_LIMITS: Record<string, number> = {
  Instagram: 2200,
  LinkedIn: 3000,
  Facebook: 63206,
  X: 280,
};

const TONES = ['Professional', 'Casual', 'Funny', 'Inspirational'] as const;
type Tone = typeof TONES[number];

function formatScheduledDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  try {
    return d.toLocaleDateString('en-AU', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return d.toISOString().slice(0, 16);
  }
}

// ── Waitlist modal state ──────────────────────────────────────────────────────

interface WaitlistState {
  submitted: boolean;
  loading: boolean;
  error: string;
}

// ── X Connect Modal ───────────────────────────────────────────────────────────

function XConnectModal({ onClose, uid }: { onClose: () => void; uid: string }) {
  const [handle, setHandle] = useState('');
  const [state, setState] = useState<WaitlistState>({ submitted: false, loading: false, error: '' });

  const handleNotify = async () => {
    if (!handle.trim()) return;
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Database unavailable');
      const cleanHandle = handle.trim().replace(/^@/, '');
      await setDoc(
        doc(db, 'users', uid),
        { socialWaitlist: { x: { handle: cleanHandle, notifiedAt: serverTimestamp() } } },
        { merge: true }
      );
      setState({ submitted: true, loading: false, error: '' });
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Failed to save. Please try again.' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center text-xl font-bold text-white">𝕏</div>
            <div>
              <h2 className="text-white font-bold text-lg">🔗 X OAuth — almost there!</h2>
              <p className="text-xs text-gray-500">Finalising the integration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl leading-none" aria-label="Close">×</button>
        </div>

        {state.submitted ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-semibold mb-1">You&apos;re on the list!</p>
            <p className="text-sm text-gray-400">
              We&apos;ll connect you directly at <span className="text-[#D4AF37]">@{handle.replace(/^@/, '')}</span> when X is ready.
            </p>
            <button onClick={onClose} className="mt-5 px-5 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition">Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">
              We&apos;re finalising the integration. Drop your handle below and we&apos;ll connect you directly when it&apos;s ready.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5">
                <span className="text-gray-500 text-sm">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={e => setHandle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNotify(); }}
                  placeholder="yourhandle"
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                  autoFocus
                />
              </div>
              {state.error && <p className="text-xs text-red-400">{state.error}</p>}
              <button
                onClick={handleNotify}
                disabled={!handle.trim() || state.loading}
                className="w-full py-3 rounded-xl bg-white text-black text-sm font-bold hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {state.loading && <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
                Notify me
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Instagram Connect Modal ───────────────────────────────────────────────────

function InstagramConnectModal({ onClose, uid }: { onClose: () => void; uid: string }) {
  const [handle, setHandle] = useState('');
  const [state, setState] = useState<WaitlistState>({ submitted: false, loading: false, error: '' });

  const handleNotify = async () => {
    if (!handle.trim()) return;
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Database unavailable');
      const cleanHandle = handle.trim().replace(/^@/, '');
      await setDoc(
        doc(db, 'users', uid),
        { socialWaitlist: { instagram: { handle: cleanHandle, notifiedAt: serverTimestamp() } } },
        { merge: true }
      );
      setState({ submitted: true, loading: false, error: '' });
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Failed to save. Please try again.' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-xl">📸</div>
            <div>
              <h2 className="text-white font-bold text-lg">🔗 Instagram OAuth — almost there!</h2>
              <p className="text-xs text-gray-500">Finalising the integration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl leading-none" aria-label="Close">×</button>
        </div>

        {state.submitted ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-semibold mb-1">You&apos;re on the list!</p>
            <p className="text-sm text-gray-400">
              We&apos;ll connect your Instagram <span className="text-[#D4AF37]">@{handle.replace(/^@/, '')}</span> directly when it&apos;s ready.
            </p>
            <button onClick={onClose} className="mt-5 px-5 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition">Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">
              We&apos;re finalising the integration. Drop your handle below and we&apos;ll connect you directly when it&apos;s ready.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5">
                <span className="text-gray-500 text-sm">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={e => setHandle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNotify(); }}
                  placeholder="your.instagram"
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                  autoFocus
                />
              </div>
              {state.error && <p className="text-xs text-red-400">{state.error}</p>}
              <button
                onClick={handleNotify}
                disabled={!handle.trim() || state.loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {state.loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Notify me
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── LinkedIn Connect Modal ────────────────────────────────────────────────────

function LinkedInConnectModal({ onClose, uid }: { onClose: () => void; uid: string }) {
  const [handle, setHandle] = useState('');
  const [state, setState] = useState<WaitlistState>({ submitted: false, loading: false, error: '' });

  const handleNotify = async () => {
    if (!handle.trim()) return;
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Database unavailable');
      await setDoc(
        doc(db, 'users', uid),
        { socialWaitlist: { linkedin: { handle: handle.trim(), notifiedAt: serverTimestamp() } } },
        { merge: true }
      );
      setState({ submitted: true, loading: false, error: '' });
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Failed to save. Please try again.' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-xl">💼</div>
            <div>
              <h2 className="text-white font-bold text-lg">🔗 LinkedIn OAuth — almost there!</h2>
              <p className="text-xs text-gray-500">Finalising the integration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl leading-none" aria-label="Close">×</button>
        </div>

        {state.submitted ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-semibold mb-1">You&apos;re on the list!</p>
            <p className="text-sm text-gray-400">We&apos;ll connect your LinkedIn when it&apos;s ready.</p>
            <button onClick={onClose} className="mt-5 px-5 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition">Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">
              We&apos;re finalising the integration. Drop your profile URL or handle below and we&apos;ll connect you directly when it&apos;s ready.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={handle}
                onChange={e => setHandle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNotify(); }}
                placeholder="linkedin.com/in/yourname"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                autoFocus
              />
              {state.error && <p className="text-xs text-red-400">{state.error}</p>}
              <button
                onClick={handleNotify}
                disabled={!handle.trim() || state.loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {state.loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Notify me
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Facebook Connect Modal ────────────────────────────────────────────────────

function FacebookConnectModal({ onClose, uid }: { onClose: () => void; uid: string }) {
  const [handle, setHandle] = useState('');
  const [state, setState] = useState<WaitlistState>({ submitted: false, loading: false, error: '' });

  const handleNotify = async () => {
    if (!handle.trim()) return;
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Database unavailable');
      await setDoc(
        doc(db, 'users', uid),
        { socialWaitlist: { facebook: { handle: handle.trim(), notifiedAt: serverTimestamp() } } },
        { merge: true }
      );
      setState({ submitted: true, loading: false, error: '' });
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Failed to save. Please try again.' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-xl">👥</div>
            <div>
              <h2 className="text-white font-bold text-lg">🔗 Facebook OAuth — almost there!</h2>
              <p className="text-xs text-gray-500">Finalising the integration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl leading-none" aria-label="Close">×</button>
        </div>

        {state.submitted ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-semibold mb-1">You&apos;re on the list!</p>
            <p className="text-sm text-gray-400">We&apos;ll connect your Facebook Page when it&apos;s ready.</p>
            <button onClick={onClose} className="mt-5 px-5 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition">Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">
              We&apos;re finalising the integration. Drop your Page name or URL below and we&apos;ll connect you directly when it&apos;s ready.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={handle}
                onChange={e => setHandle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNotify(); }}
                placeholder="Your Facebook Page name or URL"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                autoFocus
              />
              {state.error && <p className="text-xs text-red-400">{state.error}</p>}
              <button
                onClick={handleNotify}
                disabled={!handle.trim() || state.loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {state.loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Notify me
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Schedule Post Modal ───────────────────────────────────────────────────────

interface SchedulePostModalProps {
  platform: string;
  icon: string;
  content: string;
  onClose: () => void;
  onSchedule: (post: ScheduledPost) => void;
}

function SchedulePostModal({ platform, icon, content, onClose, onSchedule }: SchedulePostModalProps) {
  const [scheduledAt, setScheduledAt] = useState('');

  const handleSchedule = () => {
    const newPost: ScheduledPost = {
      id: `${Date.now()}-${platform}`,
      platform,
      icon,
      content,
      scheduledAt: scheduledAt || '',
      status: scheduledAt ? 'Scheduled' : 'Draft',
    };
    onSchedule(newPost);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h2 className="text-white font-bold text-lg">Schedule for {platform}</h2>
              <p className="text-xs text-gray-500">Pick a date/time or save as draft</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl leading-none" aria-label="Close">×</button>
        </div>

        <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
            {content.slice(0, 140)}{content.length > 140 ? '…' : ''}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1.5">Schedule for (optional)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
            />
            <p className="text-[11px] text-gray-600 mt-1">Leave blank to save as draft</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-sm text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-black text-sm font-bold hover:opacity-90 transition"
            >
              {scheduledAt ? '🗓️ Schedule' : '💾 Save Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Char Bar ──────────────────────────────────────────────────────────────────

function CharBar({ count, limit }: { count: number; limit: number }) {
  const pct = Math.min(100, (count / limit) * 100);
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span suppressHydrationWarning className={pct > 90 ? 'text-red-400' : 'text-gray-500'}>{count} / {limit.toLocaleString()}</span>
        {pct > 90 && <span className="text-red-400 font-semibold">Near limit!</span>}
      </div>
      <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ScheduledPost['status'] }) {
  const styles: Record<ScheduledPost['status'], string> = {
    Draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    Scheduled: 'bg-green-500/10 text-green-400 border-green-500/20',
    Posted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ConnectingPlatform = 'Instagram' | 'LinkedIn' | 'Facebook' | 'X (Twitter)' | null;

interface SchedulePending {
  platform: string;
  icon: string;
  content: string;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const platformCardStyles: Record<string, { gradient: string; border: string; badge: string }> = {
  Instagram: { gradient: 'from-pink-500/10 to-purple-500/10', border: 'border-pink-500/20', badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  LinkedIn: { gradient: 'from-blue-600/10 to-blue-400/10', border: 'border-blue-500/20', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  Facebook: { gradient: 'from-indigo-500/10 to-blue-500/10', border: 'border-indigo-500/20', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  X: { gradient: 'from-gray-200/5 to-gray-400/5', border: 'border-gray-400/20', badge: 'bg-gray-400/10 text-gray-200 border-gray-400/20' },
};

export default function SocialPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [connectingPlatform, setConnectingPlatform] = useState<ConnectingPlatform>(null);

  // Content generator state
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState<Tone>('Professional');
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<PlatformPost[]>([]);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [generateError, setGenerateError] = useState('');
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  // Schedule modal
  const [schedulePending, setSchedulePending] = useState<SchedulePending | null>(null);

  // Scheduled posts (localStorage)
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);

  // Quick post state
  const [quickCaption, setQuickCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'generator' | 'quick'>('generator');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Load scheduled posts from localStorage on mount
  useEffect(() => {
    setScheduledPosts(loadScheduledPosts());
  }, []);

  const addScheduledPost = useCallback((post: ScheduledPost) => {
    setScheduledPosts(prev => {
      const updated = [post, ...prev];
      saveScheduledPosts(updated);
      return updated;
    });
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  async function handleGenerate() {
    if (!brief.trim()) return;
    setGenerating(true);
    setGenerateError('');
    setGeneratedPosts([]);
    setEditedContent({});
    try {
      const res = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: brief.trim(), tone }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      const posts: PlatformPost[] = data.posts ?? [];
      setGeneratedPosts(posts);
      const initial: Record<string, string> = {};
      posts.forEach(p => { initial[p.platform] = `${p.content}\n\n${p.hashtags}`; });
      setEditedContent(initial);
    } catch {
      setGenerateError('Failed to generate content. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy(platform: string) {
    const text = editedContent[platform] ?? '';
    navigator.clipboard.writeText(text);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  const ICON_MAP: Record<string, string> = {
    Instagram: '📸', LinkedIn: '💼', Facebook: '👥', X: '𝕏',
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
        <div>
          <h1 className="text-xl font-black text-white">Social</h1>
          <p className="text-xs text-gray-500 mt-0.5">AI-powered content for Instagram, LinkedIn, Facebook & X</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium">Live</span>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Reach', value: '4,200', icon: '📡', sub: 'this month' },
            { label: 'Engagement', value: '8.3%', icon: '💬', sub: 'avg rate' },
            { label: 'Posts', value: '12', icon: '📝', sub: 'this month' },
            { label: 'Best Post', value: '"Why AI is transforming..."', icon: '🏆', sub: 'top performer' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{stat.icon}</span>
                <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
              </div>
              <p className="text-sm font-bold text-white truncate">{stat.value}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Connect Accounts */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Connect Accounts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                label: 'Instagram' as ConnectingPlatform,
                icon: '📸',
                gradient: 'from-pink-500/20 to-purple-500/20',
                border: 'border-pink-500/20',
                text: 'text-pink-400',
                btnColor: 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90',
                btnLabel: 'Connect Instagram →',
              },
              {
                label: 'LinkedIn' as ConnectingPlatform,
                icon: '💼',
                gradient: 'from-blue-600/20 to-blue-400/20',
                border: 'border-blue-500/20',
                text: 'text-blue-400',
                btnColor: 'bg-gradient-to-r from-blue-600 to-blue-400 text-white hover:opacity-90',
                btnLabel: 'Connect LinkedIn →',
              },
              {
                label: 'Facebook' as ConnectingPlatform,
                icon: '👥',
                gradient: 'from-blue-500/20 to-indigo-500/20',
                border: 'border-indigo-500/20',
                text: 'text-indigo-400',
                btnColor: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90',
                btnLabel: 'Connect Facebook →',
              },
              {
                label: 'X (Twitter)' as ConnectingPlatform,
                icon: '𝕏',
                gradient: 'from-gray-200/10 to-gray-400/10',
                border: 'border-gray-400/20',
                text: 'text-gray-200',
                btnColor: 'bg-white text-black hover:opacity-90',
                btnLabel: 'Connect X →',
              },
            ].map(p => (
              <div
                key={p.label}
                className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${p.gradient} border ${p.border}`}
              >
                <span className="text-2xl flex-shrink-0">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${p.text} truncate`}>{p.label}</div>
                  <span className="inline-block mt-0.5 text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-500 font-medium">
                    Not connected
                  </span>
                </div>
                <button
                  onClick={() => setConnectingPlatform(p.label)}
                  className={`flex-shrink-0 text-xs px-3 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${p.btnColor}`}
                >
                  {p.btnLabel}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Connect Modals */}
        {connectingPlatform === 'X (Twitter)' && (
          <XConnectModal uid={user.uid} onClose={() => setConnectingPlatform(null)} />
        )}
        {connectingPlatform === 'Instagram' && (
          <InstagramConnectModal uid={user.uid} onClose={() => setConnectingPlatform(null)} />
        )}
        {connectingPlatform === 'LinkedIn' && (
          <LinkedInConnectModal uid={user.uid} onClose={() => setConnectingPlatform(null)} />
        )}
        {connectingPlatform === 'Facebook' && (
          <FacebookConnectModal uid={user.uid} onClose={() => setConnectingPlatform(null)} />
        )}

        {/* Schedule Post Modal */}
        {schedulePending && (
          <SchedulePostModal
            platform={schedulePending.platform}
            icon={schedulePending.icon}
            content={schedulePending.content}
            onClose={() => setSchedulePending(null)}
            onSchedule={addScheduledPost}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-[#111] rounded-xl p-1 w-fit">
          {[
            { id: 'generator', label: '✨ Content Generator' },
            { id: 'quick', label: '⚡ Quick Post' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#D4AF37] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Generator Tab */}
        {activeTab === 'generator' && (
          <section className="space-y-4">
            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">What do you want to post about?</h3>
              <p className="text-xs text-gray-500 mb-3">
                Describe your topic, product, or idea — AK writes it for all platforms simultaneously.
              </p>

              {/* Tone Selector */}
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-2 font-medium">Tone</p>
                <div className="flex gap-2 flex-wrap">
                  {TONES.map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        tone === t
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#D4AF37]/40'
                      }`}
                    >
                      {t === 'Professional' ? '🎯' : t === 'Casual' ? '😊' : t === 'Funny' ? '😂' : '💡'} {t}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={brief}
                onChange={e => setBrief(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                placeholder="e.g. We just launched a new AI tool that helps SMBs get more leads without cold calling..."
                rows={3}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-600">Cmd+Enter to generate</span>
                <button
                  onClick={handleGenerate}
                  disabled={!brief.trim() || generating}
                  className="px-5 py-2 rounded-lg bg-[#D4AF37] text-black text-sm font-bold disabled:opacity-40 hover:bg-[#c4a030] transition-colors flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : '✨ Generate Posts'}
                </button>
              </div>
              {generateError && <p className="text-xs text-red-400 mt-2">{generateError}</p>}
            </div>

            {/* Generated results */}
            {generatedPosts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">
                    Generated — <span className="text-[#D4AF37]">{tone}</span> tone
                  </p>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="text-xs px-3 py-1.5 border border-[#2a2a2a] text-gray-400 rounded-lg hover:text-white hover:border-[#D4AF37]/40 transition disabled:opacity-40"
                  >
                    🔄 Regenerate all
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {generatedPosts.map(post => {
                    const styles = platformCardStyles[post.platform] ?? {
                      gradient: 'from-gray-500/10 to-gray-400/10',
                      border: 'border-gray-500/20',
                      badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
                    };
                    const currentText = editedContent[post.platform] ?? `${post.content}\n\n${post.hashtags}`;
                    const charCount = currentText.length;
                    const limit = CHAR_LIMITS[post.platform] ?? 2200;
                    return (
                      <div key={post.platform} className={`bg-gradient-to-b ${styles.gradient} border ${styles.border} rounded-xl p-4 flex flex-col`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{post.icon}</span>
                            <span className="text-sm font-bold text-white">{post.platform}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${styles.badge}`}>
                            {post.platform === 'Instagram' ? '2,200' : post.platform === 'LinkedIn' ? '3,000' : post.platform === 'X' ? '280' : '63,206'} char limit
                          </span>
                        </div>

                        <textarea
                          value={currentText}
                          onChange={e => setEditedContent(prev => ({ ...prev, [post.platform]: e.target.value }))}
                          rows={8}
                          className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 leading-relaxed resize-none focus:outline-none focus:border-white/20 transition-colors font-mono"
                        />

                        <div className="mt-2">
                          <CharBar count={charCount} limit={limit} />
                          {post.platform === 'X' && charCount > 280 && (
                            <p className="text-[10px] text-red-400 mt-1">⚠️ Over 280 chars — trim before posting</p>
                          )}
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleCopy(post.platform)}
                            className="flex-1 py-2 rounded-lg border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/30 transition-all font-medium"
                          >
                            {copiedPlatform === post.platform ? '✅ Copied!' : '📋 Copy'}
                          </button>
                          <button
                            onClick={() =>
                              setSchedulePending({
                                platform: post.platform,
                                icon: ICON_MAP[post.platform] ?? post.icon,
                                content: currentText,
                              })
                            }
                            className="flex-1 py-2 rounded-lg border border-white/10 text-xs text-gray-300 hover:text-white hover:border-[#D4AF37]/40 transition-all font-medium"
                          >
                            🗓️ Schedule
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {generatedPosts.length === 0 && !generating && (
              <div className="bg-[#0d0d0d] border border-dashed border-[#2a2a2a] rounded-xl p-8 text-center">
                <div className="text-4xl mb-3">✨</div>
                <p className="text-sm text-gray-500">
                  Your generated content will appear here — one card per platform, editable and ready to copy or schedule.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Quick Post Tab */}
        {activeTab === 'quick' && (
          <section className="space-y-4">
            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Quick Post</h3>
                <p className="text-xs text-gray-500">Write your caption, pick platforms, then copy it to your app.</p>
              </div>

              <textarea
                value={quickCaption}
                onChange={e => setQuickCaption(e.target.value)}
                placeholder="Write your caption here..."
                rows={5}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
              />

              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">Target platforms</p>
                <div className="flex gap-2 flex-wrap">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selectedPlatforms.includes(p.id)
                          ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]'
                          : 'border-[#2a2a2a] text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <span>{p.icon}</span> {p.label}
                      {selectedPlatforms.includes(p.id) && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleMode('now')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                    scheduleMode === 'now'
                      ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-[#2a2a2a] text-gray-500'
                  }`}
                >⚡ Post Now</button>
                <button
                  onClick={() => setScheduleMode('schedule')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                    scheduleMode === 'schedule'
                      ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-[#2a2a2a] text-gray-500'
                  }`}
                >📅 Schedule</button>
              </div>

              {scheduleMode === 'schedule' && (
                <div className="space-y-2">
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
                  />
                  {quickCaption.trim() && selectedPlatforms.length > 0 && scheduleDate && (
                    <button
                      onClick={() => {
                        selectedPlatforms.forEach(pid => {
                          const p = PLATFORMS.find(x => x.id === pid);
                          if (!p) return;
                          addScheduledPost({
                            id: `${Date.now()}-${pid}`,
                            platform: p.label,
                            icon: p.icon,
                            content: quickCaption,
                            scheduledAt: scheduleDate,
                            status: 'Scheduled',
                          });
                        });
                        setQuickCaption('');
                        setScheduleDate('');
                      }}
                      className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-xs font-bold hover:opacity-90 transition"
                    >
                      🗓️ Save to Schedule
                    </button>
                  )}
                </div>
              )}

              {quickCaption.trim() && selectedPlatforms.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">How to post</p>
                  {selectedPlatforms.map(pid => {
                    const p = PLATFORMS.find(x => x.id === pid)!;
                    return (
                      <div key={pid} className="flex items-center justify-between bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span>{p.icon}</span>
                          <span className="text-xs text-gray-300">
                            Copy this to your <span className="text-white font-semibold">{p.label}</span> app
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(quickCaption);
                            setCopiedPlatform(pid);
                            setTimeout(() => setCopiedPlatform(null), 2000);
                          }}
                          className="text-xs px-2.5 py-1 border border-[#2a2a2a] text-gray-400 rounded hover:text-white hover:border-[#D4AF37]/40 transition"
                        >
                          {copiedPlatform === pid ? '✅' : '📋 Copy'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <p suppressHydrationWarning className="text-xs text-gray-600">
                {scheduleMode === 'now'
                  ? "Copy your caption above to post directly in each platform's app."
                  : `Scheduled for ${scheduleDate ? (() => { try { return new Date(scheduleDate).toLocaleString('en-AU'); } catch { return scheduleDate; } })() : 'selected time'}.`}
              </p>
            </div>
          </section>
        )}

        {/* ── Scheduled Posts ─────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Scheduled Posts</h2>
            <span className="text-xs text-gray-600">{scheduledPosts.length} post{scheduledPosts.length !== 1 ? 's' : ''}</span>
          </div>

          {scheduledPosts.length === 0 ? (
            <div className="bg-[#0d0d0d] border border-dashed border-[#2a2a2a] rounded-xl p-10 text-center">
              <div className="text-4xl mb-3">🗓️</div>
              <p className="text-sm text-gray-400 font-medium mb-1">No posts scheduled</p>
              <p className="text-xs text-gray-600">Generate content above to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scheduledPosts.map(post => (
                <div
                  key={post.id}
                  className="bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-3 flex items-center gap-4"
                >
                  <span className="text-xl flex-shrink-0">{post.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-white">{post.platform}</span>
                      <StatusBadge status={post.status} />
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {post.content.slice(0, 100)}{post.content.length > 100 ? '…' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p suppressHydrationWarning className="text-xs text-gray-500">
                      {post.status === 'Draft' ? 'No date set' : formatScheduledDate(post.scheduledAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </DashboardLayout>
  );
}
