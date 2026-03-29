import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.GOOGLE_ANALYTICS_CLIENT_ID ?? '';
const REDIRECT_URI =
  process.env.NEXT_PUBLIC_GA4_REDIRECT_URI ??
  'https://getakai.ai/api/analytics/ga4/callback';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get('uid');

  if (!uid) {
    return NextResponse.json({ error: 'uid required' }, { status: 400 });
  }

  if (!CLIENT_ID) {
    return NextResponse.json({ error: 'GA4 client not configured' }, { status: 500 });
  }

  // Encode uid in state so the callback can retrieve it
  const state = Buffer.from(JSON.stringify({ uid, redirect: '/web' })).toString('base64url');

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics.manage.users.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.json({ url: authUrl });
}
