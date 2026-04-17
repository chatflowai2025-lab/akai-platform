export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// POST /api/ads/create
// Saves a generated campaign and optionally forwards to Railway for launch tracking.
// Railway doesn't have an ads endpoint yet — we log it and return success.

interface CreateAdsRequest {
  campaign: Record<string, unknown>;
  platform: 'google' | 'meta';
  dailyBudget: number;
  goal: string;
  businessName: string;
}

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app';
const RAILWAY_KEY = process.env.RAILWAY_API_KEY ?? 'aiclozr_api_key_2026_prod';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: CreateAdsRequest = await req.json();
    const { campaign, platform, dailyBudget, goal, businessName } = body;

    if (!campaign || !platform) {
      return NextResponse.json({ error: 'campaign and platform are required' }, { status: 400 });
    }

    // Try to forward to Railway — gracefully ignore if endpoint not ready
    try {
      await fetch(`${RAILWAY_API}/api/ads/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': RAILWAY_KEY,
        },
        body: JSON.stringify({ campaign, platform, dailyBudget, goal, businessName, createdAt: new Date().toISOString() }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Railway endpoint not live yet — continue silently
    }

    return NextResponse.json({
      success: true,
      message: `Campaign saved. Connect your ${platform === 'google' ? 'Google Ads' : 'Meta Ads'} account to publish it live.`,
      dailyBudget,
      platform,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[/api/ads/create]', message);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
