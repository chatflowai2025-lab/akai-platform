import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
// Cache for 1 hour
export const revalidate = 3600;

const CLIENT_ID = process.env.GOOGLE_ANALYTICS_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET ?? '';
const GA4_PROPERTY_ID = '529416637';

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
    const data = (await res.json()) as RefreshTokenResponse;
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

async function runGA4Report(
  accessToken: string,
  startDate: string,
  endDate: string,
  dimensions: string[],
  metrics: string[],
  limit = 10
): Promise<GA4ReportResponse> {
  const pid = `properties/${GA4_PROPERTY_ID}`;
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
        dimensions: dimensions.map((name) => ({ name })),
        metrics: metrics.map((name) => ({ name })),
        limit,
      }),
    }
  );
  return res.json() as Promise<GA4ReportResponse>;
}

function safeInt(val: string | undefined): number {
  const n = parseInt(val ?? '0', 10);
  return isNaN(n) ? 0 : n;
}

function dateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0] as string;
}

export async function GET(): Promise<NextResponse> {
  // Load the service refresh token from Firestore (stored under akai/ga4config)
  let refreshToken: string | null = null;
  try {
    const db = getAdminFirestore();
    if (!db) throw new Error('Firestore unavailable');
    const snap = await db.doc('akai/ga4config').get();
    const data = snap.data();
    refreshToken = data?.refreshToken ?? null;
  } catch (err) {
    console.error('[GA4 stats] Firestore read failed:', err);
  }

  if (!refreshToken) {
    // Fallback: try env var
    refreshToken = process.env.GA4_REFRESH_TOKEN ?? null;
  }

  if (!refreshToken) {
    return NextResponse.json({ error: 'ga4_not_configured' }, { status: 503 });
  }

  // Get a fresh access token
  const accessToken = await refreshAccessToken(refreshToken);
  if (!accessToken) {
    return NextResponse.json({ error: 'token_refresh_failed' }, { status: 503 });
  }

  const today = dateString(0);
  const day28 = dateString(28);
  const day7 = dateString(7);

  // Run all reports in parallel
  const [summaryReport, pagesReport, countriesReport, week1, week2, week3, week4] =
    await Promise.all([
      // Overall totals: last 28 days
      runGA4Report(accessToken, day28, today, [], ['totalUsers', 'sessions']),
      // Top pages: last 28 days
      runGA4Report(accessToken, day28, today, ['pagePath'], ['screenPageViews'], 5),
      // Top countries: last 28 days
      runGA4Report(accessToken, day28, today, ['country'], ['sessions'], 3),
      // Weekly trend — 4 weeks
      runGA4Report(accessToken, dateString(7), today, [], ['sessions', 'totalUsers']),
      runGA4Report(accessToken, dateString(14), dateString(8), [], ['sessions', 'totalUsers']),
      runGA4Report(accessToken, dateString(21), dateString(15), [], ['sessions', 'totalUsers']),
      runGA4Report(accessToken, dateString(28), dateString(22), [], ['sessions', 'totalUsers']),
    ]);

  // Summary
  const summaryRow = summaryReport.rows?.[0];
  const totalUsers = safeInt(summaryRow?.metricValues?.[0]?.value);
  const sessions = safeInt(summaryRow?.metricValues?.[1]?.value);

  // Top pages
  const topPages = (pagesReport.rows ?? []).slice(0, 5).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? '/',
    views: safeInt(row.metricValues?.[0]?.value),
  }));

  // Top countries
  const topCountries = (countriesReport.rows ?? []).slice(0, 3).map((row) => ({
    country: row.dimensionValues?.[0]?.value ?? 'Unknown',
    sessions: safeInt(row.metricValues?.[0]?.value),
  }));

  // Weekly trend (newest first = week1)
  const weeklyTrend = [week1, week2, week3, week4].map((report, i) => {
    const row = report.rows?.[0];
    return {
      week: `W${i + 1}`,
      sessions: safeInt(row?.metricValues?.[0]?.value),
      users: safeInt(row?.metricValues?.[1]?.value),
    };
  });

  return NextResponse.json({
    propertyId: GA4_PROPERTY_ID,
    totalUsers,
    sessions,
    topPages,
    topCountries,
    weeklyTrend,
    generatedAt: new Date().toISOString(),
  });
}
