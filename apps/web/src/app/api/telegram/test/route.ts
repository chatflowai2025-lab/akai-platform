export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app';
const RAILWAY_API_KEY = process.env.RAILWAY_API_KEY || 'aiclozr_api_key_2026_prod';

// POST /api/telegram/test — sends a test Telegram message to the authenticated user
export async function POST(req: NextRequest) {
  try {
    // Verify Firebase auth token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);

    // Init Firebase Admin if needed
    if (!getApps().length) {
      if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
        return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
      }
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'clozr-60593',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        }),
      });
    }

    let uid: string;
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Call Railway to send test notification
    const res = await fetch(`${RAILWAY_API}/api/telegram/notify/${uid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': RAILWAY_API_KEY,
      },
      body: JSON.stringify({
        message: '👋 Test from AKAI! Your Telegram is connected and working.',
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error === 'not connected') {
      return NextResponse.json(
        { ok: false, error: data.error || 'Telegram not connected — use the Connect link in Settings' },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[/api/telegram/test] error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
