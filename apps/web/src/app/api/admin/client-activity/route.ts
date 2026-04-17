export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/client-activity?uid={uid}
 *
 * Returns the last 50 activityLog entries for a given user.
 * Requires x-api-key header (same key used across AKAI platform).
 *
 * Use this to see "what has Shawn been doing?" without asking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

const API_KEY = process.env.RAILWAY_API_KEY || 'aiclozr_api_key_2026_prod';

const EVENT_LABELS: Record<string, string> = {
  dashboard_viewed:            '🏠 Opened the dashboard',
  quick_action_clicked:        '⚡ Clicked Quick Action',
  setup_step_clicked:          '🚀 Tapped a setup step',
  calendar_connect_clicked:    '📅 Started connecting calendar',
  calendar_connected:          '📅 Connected calendar',
  calendar_connect_failed:     '⚠️ Calendar connection failed',
  email_guard_connect_clicked: '✉️ Started connecting email',
  email_guard_connected:       '✉️ Connected email',
  leads_uploaded:              '🎯 Uploaded leads',
  campaign_launched:           '🚀 Launched a campaign',
  email_send_modal_opened:     '📧 Opened send-email modal',
  voice_page_viewed:           '📞 Opened Voice page',
  demo_call_triggered:         '📞 Triggered a demo call',
};

function humanReadable(event: string, data: Record<string, unknown>): string {
  const base = EVENT_LABELS[event];
  if (!base) return `📌 ${event.replace(/_/g, ' ')}`;
  if (event === 'quick_action_clicked' && data.action) return `⚡ ${data.action as string}`;
  if (event === 'setup_step_clicked' && data.step) return `🚀 Setup: ${(data.step as string).replace(/_/g, ' ')}`;
  if (event === 'leads_uploaded' && data.count) return `🎯 Uploaded ${data.count} leads`;
  if (event === 'campaign_launched' && data.leadCount) return `🚀 Launched campaign — ${data.leadCount} leads`;
  if (event === 'calendar_connect_failed' && data.error) return `⚠️ Calendar failed: ${data.error as string}`;
  return base;
}

function relativeTime(isoTimestamp: string): string {
  try {
    const diff = Date.now() - new Date(isoTimestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'unknown';
  }
}

export async function GET(req: NextRequest) {
  // Auth check
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uid = req.nextUrl.searchParams.get('uid');
  if (!uid) {
    return NextResponse.json({ error: 'uid query param required' }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Firestore admin not available' }, { status: 503 });
  }

  try {
    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('activityLog')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    const entries = snap.docs.map(d => {
      const data = d.data();
      const event = (data.event as string) || (data.type as string) || 'unknown';
      const eventData = (data.data as Record<string, unknown>) ?? {};
      return {
        id: d.id,
        event,
        label: humanReadable(event, eventData),
        data: eventData,
        timestamp: (data.timestamp as string) || '',
        relativeTime: relativeTime((data.timestamp as string) || ''),
        page: (data.page as string) || '',
      };
    });

    return NextResponse.json({
      uid,
      count: entries.length,
      entries,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[admin/client-activity] Firestore error:', err);
    return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 });
  }
}
