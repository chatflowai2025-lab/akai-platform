import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ turns: [] });

  try {
    const turns: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const snap = await db.collection('conversations').doc(userId)
        .collection(date).orderBy('timestamp', 'desc').limit(10).get();
      snap.docs.forEach(doc => turns.push({ ...doc.data(), date }));
    }
    turns.sort((a, b) => ((b.timestamp as string) || '').localeCompare((a.timestamp as string) || ''));
    return NextResponse.json({ turns: turns.slice(0, 30) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
