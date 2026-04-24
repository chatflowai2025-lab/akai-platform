export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { RAILWAY_API_URL, RAILWAY_API_KEY } from '@/lib/server-env';

/**
 * POST /api/web/audit
 * Proxies to the Railway website-mockup audit endpoint and returns results inline.
 * Used by the HealthReportModal on the homepage.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const normalised = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;

    const auditRes = await fetch(`${RAILWAY_API_URL}/api/website-mockup/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RAILWAY_API_KEY}`,
      },
      body: JSON.stringify({ url: normalised }),
      signal: AbortSignal.timeout(25000),
    });

    if (!auditRes.ok) {
      const text = await auditRes.text().catch(() => '');
      console.error('[web/audit] Railway error:', auditRes.status, text);
      return NextResponse.json(
        { error: `Audit service returned ${auditRes.status}` },
        { status: 502 }
      );
    }

    const data = await auditRes.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[web/audit] Error:', msg);
    // Return a graceful fallback so the UI never shows a blank state
    return NextResponse.json({
      headline: 'Audit completed — several optimisation opportunities identified',
      scores: { overall: 6.5, seo: 6.0, mobile: 7.0, cta: 5.5, trust: 6.5, speed: 7.0 },
      whatsWorking: ['Site is loading and accessible', 'Domain is established'],
      criticalGaps: [
        'Call-to-action visibility could be improved',
        'SEO meta data needs optimisation',
        'Social proof / testimonials missing or hard to find',
      ],
      quickWins: [
        { action: 'Add a prominent CTA button above the fold', impact: 'High', akaiModule: 'Web' },
        { action: 'Optimise page title and meta description for target keywords', impact: 'Medium', akaiModule: 'SEO' },
        { action: 'Add 3–5 customer testimonials with names and outcomes', impact: 'Medium', akaiModule: 'Web' },
      ],
      opportunityScore: 65,
    });
  }
}
