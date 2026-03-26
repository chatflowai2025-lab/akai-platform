import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// AKAI Ads — Generate campaign endpoint
// POST /api/ads/generate
// Accepts: { businessName, targetAudience, location, budget, goal }
// Returns: { campaignName, adGroups: [{ name, headlines[], descriptions[], keywords[] }] }
// ---------------------------------------------------------------------------

interface AdsGenerateRequest {
  businessName: string;
  targetAudience: string;
  location: string;
  budget: string;
  goal: 'leads' | 'sales' | 'awareness';
}

interface AdGroup {
  name: string;
  headlines: string[];
  descriptions: string[];
  keywords: string[];
}

interface CampaignResult {
  campaignName: string;
  adGroups: AdGroup[];
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: AdsGenerateRequest = await req.json();
    const { businessName, targetAudience, location, budget, goal } = body;

    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'businessName is required' }, { status: 400 });
    }

    const prompt = `You are a Google Ads expert. Generate a complete Google Ads campaign for the following business.

Business: ${businessName}
Target audience: ${targetAudience || 'general consumers'}
Location: ${location || 'Australia'}
Monthly budget: ${budget ? `$${budget}` : 'not specified'}
Campaign goal: ${goal || 'leads'}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "campaignName": "string",
  "adGroups": [
    {
      "name": "string",
      "headlines": ["string", "string", "string", "string", "string"],
      "descriptions": ["string", "string"],
      "keywords": ["string", "string", "string", "string", "string", "string", "string", "string"]
    }
  ]
}

Rules:
- Exactly 3 ad groups
- Exactly 5 headlines per ad group (max 30 chars each)
- Exactly 2 descriptions per ad group (max 90 chars each)
- 6-8 keywords per ad group (mix of broad, phrase, and exact match — just write the keyword text, no brackets)
- Campaign name should be punchy and relevant
- Headlines must be compelling and specific to the goal: ${goal}
- No placeholder text — make it real and usable`;

    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';

    // Strip any markdown fences if present
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let campaign: CampaignResult;
    try {
      campaign = JSON.parse(cleaned);
    } catch {
      console.error('[/api/ads/generate] Failed to parse Claude response:', cleaned);
      return NextResponse.json({ error: 'Failed to parse campaign data. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(campaign, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[/api/ads/generate]', message);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
