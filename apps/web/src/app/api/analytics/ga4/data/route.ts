import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const CLIENT_ID = process.env.GOOGLE_ANALYTICS_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET ?? '';

interface GA4Connection {
  propertyId: string;
  propertyName: string;
  connected: boolean;
  accessToken: string;
  refreshToken: string;
  connectedAt: string;
}

interface RefreshTokenResponse {
  access_token?: string;
  error?: string;
}

interface GA4MetricValue {
  value?: string;
}

interface GA4DimensionValue {
  value?: string;
}

interface GA4Row {
  metricValues?: GA4MetricValue[];
  dimensionValues?: GA4DimensionValue[];
}

interface GA4ReportResponse {
  rows?: GA4Row[];
  error?: { message: string; code: number };
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
    const data = await res.json() as RefreshTokenResponse;
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

function dateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0] as string;
}

async function runGA4Report(
  propertyId: string,
  accessToken: string,
  startDate: string,
  endDate: string,
  dimensions: string[],
  metrics: string[]
): Promise<GA4ReportResponse> {
  // propertyId already includes "properties/" prefix
  const pid = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${pid}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: dimensions.map(name => ({ name })),
        metrics: metrics.map(name => ({ name })),
        limit: 10,
      }),
    }
  );
  return res.json() as Promise<GA4ReportResponse>;
}

function safeInt(val: string | undefined): number {
  const n = parseInt(val ?? '0', 10);
  return isNaN(n) ? 0 : n;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get('uid');

  if (!uid) {
    return NextResponse.json({ error: 'uid required' }, { status: 400 });
  }

  // Load GA4 connection from Firestore
  let connection: GA4Connection | null = null;
  try {
    const db = getAdminFirestore();
    if (!db) throw new Error('Firestore unavailable');
    const snap = await db.doc(`users/${uid}`).get();
    const data = snap.data();
    if (!data?.ga4Connection?.connected) {
      return NextResponse.json({ error: 'ga4_not_connected' }, { status: 403 });
    }
    connection = data.ga4Connection as GA4Connection;
  } catch (err) {
    console.error('[GA4 data] Firestore read failed:', err);
    return NextResponse.json({ error: 'firestore_error' }, { status: 500 });
  }

  let { accessToken } = connection;
  const { refreshToken, propertyId, propertyName } = connection;

  if (!propertyId) {
    return NextResponse.json({ error: 'no_property_id' }, { status: 400 });
  }

  // Date ranges
  const today = dateString(0);
  const day7 = dateString(7);
  const day8 = dateString(8);
  const day14 = dateString(14);

  // Run reports — current 7 days
  const [coreReport, prevReport, pagesReport, referrersReport] = await Promise.all([
    runGA4Report(propertyId, accessToken, day7, today, [], ['sessions', 'screenPageViews', 'activeUsers']),
    runGA4Report(propertyId, accessToken, day14, day8, [], ['sessions', 'screenPageViews', 'activeUsers']),
    runGA4Report(propertyId, accessToken, day7, today, ['pagePath'], ['screenPageViews']),
    runGA4Report(propertyId, accessToken, day7, today, ['sessionSource'], ['sessions']),
  ]);

  // Handle token expiry (401 on any report) and retry once
  const needsRefresh =
    coreReport.error?.code === 401 ||
    pagesReport.error?.code === 401;

  if (needsRefresh && refreshToken) {
    const newToken = await refreshAccessToken(refreshToken);
    if (newToken) {
      accessToken = newToken;
      // Update in Firestore
      try {
        const db = getAdminFirestore();
        if (db) {
          await db.doc(`users/${uid}`).set(
            { ga4Connection: { accessToken: newToken } },
            { merge: true }
          );
        }
      } catch { /* non-fatal */ }

      // Retry all reports
      const [r1, r2, r3, r4] = await Promise.all([
        runGA4Report(propertyId, accessToken, day7, today, [], ['sessions', 'screenPageViews', 'activeUsers']),
        runGA4Report(propertyId, accessToken, day14, day8, [], ['sessions', 'screenPageViews', 'activeUsers']),
        runGA4Report(propertyId, accessToken, day7, today, ['pagePath'], ['screenPageViews']),
        runGA4Report(propertyId, accessToken, day7, today, ['sessionSource'], ['sessions']),
      ]);
      return buildResponse(propertyId, propertyName, r1, r2, r3, r4);
    }
  }

  return buildResponse(propertyId, propertyName, coreReport, prevReport, pagesReport, referrersReport);
}

function buildResponse(
  propertyId: string,
  propertyName: string,
  coreReport: GA4ReportResponse,
  prevReport: GA4ReportResponse,
  pagesReport: GA4ReportResponse,
  referrersReport: GA4ReportResponse
) {
  // Core metrics — current 7 days (no dimensions → single row)
  const coreRow = coreReport.rows?.[0];
  const sessions = safeInt(coreRow?.metricValues?.[0]?.value);
  const pageViews = safeInt(coreRow?.metricValues?.[1]?.value);
  const activeUsers = safeInt(coreRow?.metricValues?.[2]?.value);

  // Previous 7 days
  const prevRow = prevReport.rows?.[0];
  const prevSessions = safeInt(prevRow?.metricValues?.[0]?.value);
  const prevPageViews = safeInt(prevRow?.metricValues?.[1]?.value);
  const prevActiveUsers = safeInt(prevRow?.metricValues?.[2]?.value);

  // Top pages
  const topPages = (pagesReport.rows ?? []).slice(0, 5).map(row => ({
    path: row.dimensionValues?.[0]?.value ?? '/',
    views: safeInt(row.metricValues?.[0]?.value),
  }));

  // Top referrers
  const referrers = (referrersReport.rows ?? []).slice(0, 5).map(row => ({
    source: row.dimensionValues?.[0]?.value ?? '(direct)',
    sessions: safeInt(row.metricValues?.[0]?.value),
  }));

  return NextResponse.json({
    propertyId,
    propertyName,
    sessions,
    pageViews,
    activeUsers,
    sessionsPct: pctChange(sessions, prevSessions),
    pageViewsPct: pctChange(pageViews, prevPageViews),
    activeUsersPct: pctChange(activeUsers, prevActiveUsers),
    topPages,
    referrers,
  });
}
