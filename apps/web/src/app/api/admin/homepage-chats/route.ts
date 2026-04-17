/**
 * GET /api/admin/homepage-chats
 * Internal read-only endpoint — returns homepage chat logs.
 * Protected by x-api-key header.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

const ADMIN_KEY = process.env.ADMIN_API_KEY || 'aiclozr_api_key_2026_prod';

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-api-key');
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'Firestore unavailable' }, { status: 503 });

    const hoursParam = req.nextUrl.searchParams.get('hours');
    const hours = Math.min(Number(hoursParam) || 24, 168); // max 7 days
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const snap = await db.collection('homepageChats')
      .where('timestamp', '>=', since)
      .orderBy('timestamp', 'asc')
      .limit(500)
      .get();

    const sessions: Record<string, Array<{ time: string; q: string; a: string }>> = {};
    snap.forEach(d => {
      const data = d.data();
      const sid = ((data.sessionId as string) || 'unknown').slice(0, 12);
      if (!sessions[sid]) sessions[sid] = [];
      sessions[sid].push({
        time: ((data.timestamp as string) || '').slice(11, 16) + ' UTC',
        q: (data.userMessage as string) || '',
        a: ((data.akResponse as string) || '').slice(0, 250),
      });
    });

    const sessionList = Object.entries(sessions).map(([sid, msgs]) => ({
      sessionId: sid,
      messageCount: msgs.length,
      messages: msgs,
    }));

    return NextResponse.json({
      since: since.slice(0, 16) + ' UTC',
      totalMessages: snap.size,
      totalSessions: sessionList.length,
      sessions: sessionList,
    });
  } catch (err) {
    console.error('[admin/homepage-chats]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
