import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth check
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uid = req.nextUrl.searchParams.get('uid');
  if (!uid) {
    return NextResponse.json({ lastRun: null, history: [] });
  }

  try {
    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({ lastRun: null, history: [] });
    }

    const doc = await db
      .collection('users')
      .doc(uid)
      .collection('codeShield')
      .doc('lastRun')
      .get();

    if (!doc.exists) {
      return NextResponse.json({ lastRun: null, history: [] });
    }

    const lastRun = doc.data();
    return NextResponse.json({ lastRun: lastRun ?? null, history: lastRun ? [lastRun] : [] });
  } catch (e) {
    console.error('[code-shield/status] Firestore read failed:', e);
    return NextResponse.json({ lastRun: null, history: [] });
  }
}
