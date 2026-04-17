/**
 * GET /api/admin/users
 * Returns non-sensitive user list for internal monitoring.
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

    const snap = await db.collection('users').limit(50).get();
    const users: Array<Record<string, unknown>> = [];

    snap.forEach(d => {
      const data = d.data();
      const createdAt = data.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10)
        ?? (typeof data.createdAt === 'string' ? data.createdAt.slice(0, 10) : null);
      users.push({
        uid: d.id.slice(0, 8),
        email: data.email || null,
        businessName: data.businessName || data.onboarding?.businessName || null,
        plan: data.plan || 'trial',
        gmailConnected: !!(data.gmail?.connected || data.gmailConnected),
        calendarConnected: !!data.googleCalendarConnected,
        msConnected: !!(data.inboxConnection?.connected || data.microsoftConnected),
        createdAt,
      });
    });

    return NextResponse.json({ total: users.length, users });
  } catch (err) {
    console.error('[admin/users]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
