export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const CLIENT_ID = process.env.GBP_CLIENT_ID ?? '483958880068-fl9q2ildmfjmhfcat93pkqpcrl79qhb4.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GBP_CLIENT_SECRET ?? '';

function getAdminAuth() {
  try {
    const apps = getApps();
    const adminApp = apps.find(a => a.name === 'admin');
    if (!adminApp) return null;
    return getAuth(adminApp);
  } catch {
    return null;
  }
}

async function verifyToken(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) return null;
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.data() ?? {};
  const gbp = userData.gbpConnection as {
    connected?: boolean;
    accessToken?: string;
    refreshToken?: string;
  } | undefined;

  if (!gbp?.connected || !gbp.accessToken) {
    return NextResponse.json({ error: 'GBP not connected' }, { status: 403 });
  }

  let accessToken = gbp.accessToken;

  // Try to list accounts
  let accountsRes = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  // If 401, try refreshing token
  if (accountsRes.status === 401 && gbp.refreshToken) {
    const newToken = await refreshAccessToken(gbp.refreshToken);
    if (newToken) {
      accessToken = newToken;
      await db.doc(`users/${uid}`).set(
        { gbpConnection: { accessToken: newToken } },
        { merge: true }
      );
      accountsRes = await fetch(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    }
  }

  if (!accountsRes.ok) {
    const errText = await accountsRes.text();
    console.error('[GBP profile] accounts fetch failed:', errText);
    return NextResponse.json({ error: 'Failed to fetch GBP accounts' }, { status: 502 });
  }

  const accountsData = await accountsRes.json() as { accounts?: { name: string; accountName: string }[] };
  const accounts = accountsData.accounts ?? [];
  if (accounts.length === 0) {
    return NextResponse.json({ error: 'No GBP accounts found' }, { status: 404 });
  }

  const accountName = accounts[0]?.name ?? '';

  // Fetch locations
  const locRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,phoneNumbers,websiteUri,categories,regularHours,metadata`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!locRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 502 });
  }

  const locData = await locRes.json() as {
    locations?: {
      name: string;
      title?: string;
      phoneNumbers?: { primaryPhone?: string };
      websiteUri?: string;
      categories?: { primaryCategory?: { displayName?: string } };
      metadata?: { mapsUri?: string; rating?: number; userRatingCount?: number };
    }[];
  };

  const location = locData.locations?.[0];
  if (!location) {
    return NextResponse.json({ error: 'No locations found' }, { status: 404 });
  }

  const profile = {
    name: location.title ?? 'Unknown',
    phone: location.phoneNumbers?.primaryPhone ?? '',
    website: location.websiteUri ?? '',
    category: location.categories?.primaryCategory?.displayName ?? '',
    mapsUrl: location.metadata?.mapsUri ?? '',
    rating: location.metadata?.rating ?? null,
    reviewCount: location.metadata?.userRatingCount ?? 0,
    locationName: location.name,
    accountName,
  };

  return NextResponse.json({ profile });
}
