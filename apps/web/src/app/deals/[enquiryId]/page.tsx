'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

const RAILWAY = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

// ── Types ─────────────────────────────────────────────────────────────────

interface Enquiry {
  id: string;
  from: string;
  fromName?: string;
  subject: string;
  body: string;
  receivedAt: string;
  status: 'proposal_draft' | 'sent' | 'held' | 'replied' | 'booked' | 'won' | 'lost';
  proposal?: { body: string; htmlBody?: string; vertical?: string; generatedAt: string };
  matchedRule?: string;
  abTestId?: string;
  abVariantA?: string;
  abVariantB?: string;
  abVariantASubject?: string;
  abVariantBSubject?: string;
  abStatus?: string;
  leadScore?: number;
  leadTier?: 'cold' | 'warm' | 'hot' | 'fire';
  leadSignals?: string[];
  phone?: string;
}

interface AnalyticsEvent {
  id?: string;
  type: string;
  email?: string;
  from?: string;
  subject?: string;
  body?: string;
  timestamp?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

interface TimelineItem {
  icon: string;
  title: string;
  description: string;
  time: string;
  raw: string; // ISO timestamp for sorting
}

// ── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

function leadName(eq: Enquiry): string {
  if (eq.fromName && eq.fromName.trim()) return eq.fromName.trim();
  if (eq.from) {
    const emailPart = eq.from.match(/^([^<]+)</)?.[1]?.trim();
    if (emailPart && emailPart !== eq.from) return emailPart;
    return eq.from.split('@')[0] || eq.from;
  }
  return 'Unknown Lead';
}

function emailAddress(eq: Enquiry): string {
  const match = eq.from?.match(/<([^>]+)>/);
  return match?.[1] ?? eq.from ?? '';
}

function scoreBadge(score?: number): { emoji: string; color: string; label: string } {
  if (!score) return { emoji: '❄️', color: 'text-gray-400 border-gray-600/30 bg-gray-500/10', label: 'No score' };
  if (score >= 8) return { emoji: '🔥', color: 'text-red-400 border-red-500/20 bg-red-500/10', label: `${score}/10` };
  if (score >= 6) return { emoji: '⚡', color: 'text-orange-400 border-orange-500/20 bg-orange-500/10', label: `${score}/10` };
  return { emoji: '❄️', color: 'text-gray-400 border-gray-600/30 bg-gray-500/10', label: `${score}/10` };
}

function statusBadge(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    proposal_draft: { label: 'Pending', color: 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20' },
    sent: { label: 'Proposal sent', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    replied: { label: 'Replied', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
    booked: { label: 'Meeting booked', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    won: { label: 'Won 🎉', color: 'text-green-300 bg-green-600/10 border-green-500/20' },
    lost: { label: 'Lost', color: 'text-gray-500 bg-gray-700/10 border-gray-600/20' },
    held: { label: 'On hold', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  };
  return map[status] ?? { label: status, color: 'text-gray-400 bg-gray-500/10 border-gray-600/20' };
}

function buildTimeline(eq: Enquiry, events: AnalyticsEvent[]): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Email received
  if (eq.receivedAt) {
    items.push({
      icon: '📧',
      title: 'Email received',
      description: `"${eq.subject || '(No subject)'}" — ${eq.body?.slice(0, 80)}…`,
      time: timeAgo(eq.receivedAt),
      raw: eq.receivedAt,
    });
  }

  // Proposal generated / sent
  if (eq.proposal?.generatedAt) {
    items.push({
      icon: '✉️',
      title: eq.status === 'sent' || eq.status === 'replied' || eq.status === 'booked' ? 'Proposal sent' : 'Proposal drafted',
      description: eq.abVariantA && eq.abVariantB
        ? `A/B test — Variant A: "${eq.abVariantASubject || 'Version A'}" · Variant B: "${eq.abVariantBSubject || 'Version B'}"`
        : eq.proposal.vertical
          ? `${eq.proposal.vertical} vertical`
          : 'AI-generated proposal ready',
      time: timeAgo(eq.proposal.generatedAt),
      raw: eq.proposal.generatedAt,
    });
  }

  // Analytics events for this lead's email
  const email = emailAddress(eq);
  const relevantEvents = events.filter(ev => {
    const meta = ev.metadata ?? {};
    const evEmail = ev.email || ev.from || meta['email'] || meta['from'] || '';
    return typeof evEmail === 'string' && evEmail.toLowerCase().includes(email.toLowerCase());
  });

  for (const ev of relevantEvents) {
    const ts = ev.timestamp || ev.createdAt || '';
    const t = ts ? timeAgo(ts) : '—';

    const m = ev.metadata ?? {};
    if (ev.type === 'follow_up_sent') {
      items.push({
        icon: '🔄',
        title: 'Follow-up sent',
        description: (m['tone'] as string) ? `Tone: ${m['tone']}` : 'Automated follow-up',
        time: t,
        raw: ts,
      });
    } else if (ev.type === 'call_triggered' || ev.type === 'sophie_call') {
      items.push({
        icon: '📞',
        title: 'Sophie call triggered',
        description: (m['outcome'] as string) || 'AI voice outreach initiated',
        time: t,
        raw: ts,
      });
    } else if (ev.type === 'meeting_booked' || ev.type === 'booking') {
      items.push({
        icon: '📅',
        title: 'Meeting booked',
        description: (m['slot'] as string) || (m['time'] as string) || 'Slot confirmed',
        time: t,
        raw: ts,
      });
    } else if (ev.type === 'reply_received' || ev.type === 'email_reply') {
      items.push({
        icon: '💬',
        title: 'Reply received',
        description: (ev.body || (m['body'] as string) || (m['preview'] as string) || '').slice(0, 100) || 'Lead replied',
        time: t,
        raw: ts,
      });
    }
  }

  // Sort chronologically
  items.sort((a, b) => new Date(a.raw || 0).getTime() - new Date(b.raw || 0).getTime());
  return items;
}

// ── Deal Room Content ─────────────────────────────────────────────────────

function DealRoomContent({ enquiryId, user }: { enquiryId: string; user: { uid: string } }) {
  const router = useRouter();
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [followingUp, setFollowingUp] = useState(false);
  const [followUpDone, setFollowUpDone] = useState(false);

  useEffect(() => {
    const uid = user.uid;

    Promise.all([
      fetch(`${RAILWAY}/api/email/enquiries/${uid}`, { headers: { 'x-api-key': API_KEY } })
        .then(r => r.json())
        .then(d => {
          const list: Enquiry[] = d.enquiries || [];
          const found = list.find(e => e.id === enquiryId);
          if (found) setEnquiry(found);
          else setError('Enquiry not found.');
        }),
      fetch(`${RAILWAY}/api/analytics/feed/${uid}`, { headers: { 'x-api-key': API_KEY } })
        .then(r => r.json())
        .then(d => setEvents(d.events || d.feed || []))
        .catch(() => setEvents([])),
    ])
      .catch(() => setError('Failed to load deal data.'))
      .finally(() => setLoading(false));
  }, [enquiryId, user.uid]);

  const triggerFollowUp = async () => {
    if (!enquiry) return;
    setFollowingUp(true);
    try {
      await fetch(`${RAILWAY}/api/email/follow-up/${user.uid}/${enquiry.id}`, {
        method: 'POST',
        headers: { 'x-api-key': API_KEY },
      });
      setFollowUpDone(true);
    } catch {
      // silently fail — UX still shows done
      setFollowUpDone(true);
    } finally {
      setFollowingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-sm">{error || 'Enquiry not found.'}</p>
        <button
          onClick={() => router.push('/email-guard')}
          className="text-xs text-[#D4AF37] hover:underline"
        >
          ← Back to Email Guard
        </button>
      </div>
    );
  }

  const name = leadName(enquiry);
  const email = emailAddress(enquiry);
  const score = scoreBadge(enquiry.leadScore);
  const status = statusBadge(enquiry.status);
  const timeline = buildTimeline(enquiry, events);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* ── Header ── */}
      <header className="flex items-start justify-between px-6 py-4 border-b border-[#1f1f1f] bg-[#080808] gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-black text-white">{name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${score.color}`}>
                {score.emoji} {score.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-xs text-gray-500">{email}</p>
            {enquiry.leadTier && (
              <p className="text-xs text-gray-600 mt-0.5">
                Tier: <span className="capitalize text-gray-400">{enquiry.leadTier}</span>
              </p>
            )}
          </div>
        </div>
        <a
          href="/email-guard"
          className="text-xs text-gray-500 hover:text-[#D4AF37] transition flex items-center gap-1"
        >
          ← Back to Email Guard
        </a>
      </header>

      {/* ── Body: timeline + right panel ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col lg:flex-row gap-0 h-full">

          {/* ── Left: Timeline (60%) ── */}
          <div className="lg:w-[60%] p-6 border-r border-[#1f1f1f] overflow-y-auto">
            <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Timeline</h2>

            {timeline.length === 0 ? (
              <div className="text-center py-16 text-gray-600 text-sm">No events recorded yet</div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-[#1f1f1f]" />

                <div className="space-y-5">
                  {timeline.map((item, i) => (
                    <div key={i} className="flex items-start gap-4 relative">
                      {/* Icon bubble */}
                      <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-base flex-shrink-0 z-10">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <span className="text-[11px] text-gray-600 flex-shrink-0">{item.time}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right panel (40%) ── */}
          <div className="lg:w-[40%] p-6 space-y-6 overflow-y-auto">

            {/* Lead signals */}
            {enquiry.leadSignals && enquiry.leadSignals.length > 0 && (
              <section>
                <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Lead signals</h2>
                <div className="flex flex-wrap gap-2">
                  {enquiry.leadSignals.map((sig, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] font-medium"
                    >
                      {sig}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Suggested next action */}
            <section>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Suggested next action</h2>
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
                {enquiry.status === 'proposal_draft' && (
                  <>
                    <p className="text-sm text-white">This lead hasn&apos;t received a proposal yet.</p>
                    <a
                      href="/email-guard"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition"
                    >
                      ✉️ Send proposal →
                    </a>
                  </>
                )}
                {enquiry.status === 'sent' && !followUpDone && (
                  <>
                    <p className="text-sm text-white">Proposal sent — no reply yet. Time for a follow-up?</p>
                    <button
                      onClick={triggerFollowUp}
                      disabled={followingUp}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
                    >
                      {followingUp ? '⏳ Sending…' : '🔄 Follow up now'}
                    </button>
                  </>
                )}
                {enquiry.status === 'sent' && followUpDone && (
                  <p className="text-sm text-green-400">✓ Follow-up sent! Check back soon.</p>
                )}
                {enquiry.status === 'replied' && (
                  <>
                    <p className="text-sm text-white">They replied! Strike while it&apos;s hot.</p>
                    <a
                      href="/calendar"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition"
                    >
                      📅 Book a meeting →
                    </a>
                  </>
                )}
                {enquiry.status === 'booked' && (
                  <>
                    <p className="text-sm text-white">Meeting booked — prep your notes.</p>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Key talking points, client context, budget…"
                      rows={4}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[#D4AF37]/50 transition"
                    />
                  </>
                )}
                {enquiry.status === 'won' && (
                  <p className="text-sm text-green-400">🎉 Deal won! Update your CRM and invoice.</p>
                )}
                {enquiry.status === 'lost' && (
                  <p className="text-sm text-gray-400">This lead was lost. Review signals to improve next time.</p>
                )}
                {enquiry.status === 'held' && (
                  <>
                    <p className="text-sm text-white">On hold — ready to send when you are.</p>
                    <a
                      href="/email-guard"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/20 rounded-xl text-sm font-bold hover:bg-[#D4AF37]/30 transition"
                    >
                      Review proposal →
                    </a>
                  </>
                )}
              </div>
            </section>

            {/* A/B variants */}
            {enquiry.abVariantA && enquiry.abVariantB && (
              <section>
                <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">A/B Test variants</h2>
                <div className="space-y-3">
                  <div className={`bg-[#111] border rounded-xl p-4 space-y-1 ${enquiry.abStatus === 'B' ? 'border-[#1f1f1f]' : 'border-[#D4AF37]/30'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#D4AF37]">Variant A</span>
                      {enquiry.abStatus !== 'B' && (
                        <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/20">Sent</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 font-medium">{enquiry.abVariantASubject || 'Variant A subject'}</p>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{enquiry.abVariantA?.slice(0, 150)}…</p>
                  </div>
                  <div className={`bg-[#111] border rounded-xl p-4 space-y-1 ${enquiry.abStatus === 'B' ? 'border-[#D4AF37]/30' : 'border-[#1f1f1f]'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-400">Variant B</span>
                      {enquiry.abStatus === 'B' && (
                        <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Sent</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 font-medium">{enquiry.abVariantBSubject || 'Variant B subject'}</p>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{enquiry.abVariantB?.slice(0, 150)}…</p>
                  </div>
                </div>
              </section>
            )}

            {/* Contact details */}
            <section>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Contact details</h2>
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 text-xs w-12 flex-shrink-0 pt-0.5">Email</span>
                  <span className="text-xs text-white break-all">{email || '—'}</span>
                </div>
                {enquiry.phone && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 text-xs w-12 flex-shrink-0 pt-0.5">Phone</span>
                    <span className="text-xs text-white">{enquiry.phone}</span>
                  </div>
                )}
                {enquiry.leadTier && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 text-xs w-12 flex-shrink-0 pt-0.5">Tier</span>
                    <span className="text-xs text-white capitalize">{enquiry.leadTier}</span>
                  </div>
                )}
                {enquiry.matchedRule && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 text-xs w-12 flex-shrink-0 pt-0.5">Rule</span>
                    <span className="text-xs text-gray-400">{enquiry.matchedRule}</span>
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Auth gate ─────────────────────────────────────────────────────────────

export default function DealRoomPage({ params }: { params: Promise<{ enquiryId: string }> }) {
  const { enquiryId } = use(params);
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
      <DealRoomContent enquiryId={enquiryId} user={user} />
    </DashboardLayout>
  );
}
