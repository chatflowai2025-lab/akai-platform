import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

const CLIENT_ID = process.env.GOOGLE_ANALYTICS_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET ?? '';
const REDIRECT_URI =
  process.env.NEXT_PUBLIC_GA4_REDIRECT_URI ??
  'https://getakai.ai/api/analytics/ga4/callback';

export const runtime = 'nodejs';

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface PropertySummary {
  property: string;
  displayName: string;
}

interface AccountSummary {
  account: string;
  displayName: string;
  propertySummaries?: PropertySummary[];
}

interface AccountSummariesResponse {
  accountSummaries?: AccountSummary[];
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

async function listGA4Properties(accessToken: string): Promise<AccountSummariesResponse> {
  const res = await fetch(
    'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.json() as Promise<AccountSummariesResponse>;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getakai.ai';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  if (errorParam) {
    return NextResponse.redirect(
      `${BASE_URL}/web?ga4=error&reason=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${BASE_URL}/web?ga4=error&reason=missing_params`);
  }

  let uid = '';
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8')) as {
      uid: string;
    };
    uid = decoded.uid;
  } catch {
    return NextResponse.redirect(`${BASE_URL}/web?ga4=error&reason=invalid_state`);
  }

  if (!uid) {
    return NextResponse.redirect(`${BASE_URL}/web?ga4=error&reason=no_uid`);
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);
  if (tokens.error ?? !tokens.access_token) {
    const reason = tokens.error_description ?? tokens.error ?? 'token_exchange_failed';
    return NextResponse.redirect(
      `${BASE_URL}/web?ga4=error&reason=${encodeURIComponent(reason)}`
    );
  }

  // List GA4 properties
  let propertyId = '';
  let propertyName = '';
  try {
    const summaries = await listGA4Properties(tokens.access_token);
    if (summaries.accountSummaries && summaries.accountSummaries.length > 0) {
      const firstAccount = summaries.accountSummaries[0];
      if (firstAccount?.propertySummaries && firstAccount.propertySummaries.length > 0) {
        const firstProp = firstAccount.propertySummaries[0];
        if (firstProp) {
          propertyId = firstProp.property;
          propertyName = firstProp.displayName;
        }
      }
    }
  } catch (err) {
    console.error('[GA4 callback] Failed to list properties:', err);
  }

  // Save to Firestore via Admin SDK
  try {
    const db = getAdminFirestore();
    if (db) {
      await db.doc(`users/${uid}`).set(
        {
          ga4Connection: {
            propertyId,
            propertyName,
            connected: true,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? '',
            connectedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.error('[GA4 callback] Firestore write failed:', err);
  }

  return NextResponse.redirect(`${BASE_URL}/web?ga4=connected`);
}
