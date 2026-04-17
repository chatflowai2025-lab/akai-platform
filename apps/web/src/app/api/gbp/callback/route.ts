export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const CLIENT_ID = process.env.GBP_CLIENT_ID ?? '483958880068-fl9q2ildmfjmhfcat93pkqpcrl79qhb4.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GBP_CLIENT_SECRET ?? '';
const REDIRECT_URI = 'https://getakai.ai/api/gbp/callback';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getakai.ai';

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString(),
  });
  return res.json() as Promise<TokenResponse>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  if (errorParam) {
    return NextResponse.redirect(`${BASE_URL}/gbp?gbp=error&reason=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${BASE_URL}/gbp?gbp=error&reason=missing_params`);
  }

  let uid = '';
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8')) as { uid: string };
    uid = decoded.uid;
  } catch {
    return NextResponse.redirect(`${BASE_URL}/gbp?gbp=error&reason=invalid_state`);
  }

  if (!uid) {
    return NextResponse.redirect(`${BASE_URL}/gbp?gbp=error&reason=no_uid`);
  }

  const tokens = await exchangeCodeForTokens(code);
  if (tokens.error ?? !tokens.access_token) {
    const reason = tokens.error_description ?? tokens.error ?? 'token_exchange_failed';
    return NextResponse.redirect(`${BASE_URL}/gbp?gbp=error&reason=${encodeURIComponent(reason)}`);
  }

  try {
    const db = getAdminFirestore();
    if (db) {
      await db.doc(`users/${uid}`).set(
        {
          gbpConnection: {
            connected: true,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? '',
            expiresIn: tokens.expires_in ?? 3600,
            connectedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.error('[GBP callback] Firestore write failed:', err);
  }

  return NextResponse.redirect(`${BASE_URL}/gbp?gbp=connected`);
}
