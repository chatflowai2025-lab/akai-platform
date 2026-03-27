import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// AKAI Ads — Generate campaign endpoint
// POST /api/ads/generate
// Google: { businessName, targetAudience, location, budget, goal, platform?: 'google' }
// Meta:   { businessName, targetAudience, location, budget, goal, platform: 'meta' }
// Returns (Google): { campaignName, adGroups: [{ name, headlines[], descriptions[], keywords[] }] }
// Returns (Meta):   { adSets: [{ name, primaryText, headline, description, cta, audience }] }
// ---------------------------------------------------------------------------

interface AdsGenerateRequest {
  businessName: string;
  targetAudience?: string;
  location?: string;
  budget?: string;
  goal?: 'leads' | 'sales' | 'awareness';
  platform?: 'google' | 'meta';
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

interface AdSet {
  name: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  audience: string;
}

interface MetaCampaignResult {
  campaignName: string;
  adSets: AdSet[];
}

// Client initialized lazily inside handler to avoid build-time crash

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: AdsGenerateRequest = await req.json();
    const { businessName, targetAudience, location, budget, goal, platform = 'google' } = body;

    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'businessName is required' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // ── Meta / Facebook + Instagram Ads ──────────────────────────────────────
    if (platform === 'meta') {
      const metaPrompt = `You are a Meta Ads (Facebook & Instagram) expert. Generate a complete Meta Ads campaign for the following business.

Business: ${businessName}
Target audience: ${targetAudience || 'general consumers'}
Location: ${location || 'Australia'}
Monthly budget: ${budget ? `$${budget}` : 'not specified'}
Campaign goal: ${goal || 'leads'}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "campaignName": "string",
  "adSets": [
    {
      "name": "string",
      "primaryText": "string (the main ad body copy, 1-3 paragraphs, engaging and conversational)",
      "headline": "string (max 40 chars, punchy and clear)",
      "description": "string (max 30 chars, supporting detail)",
      "cta": "string (one of: Learn More, Shop Now, Sign Up, Get Quote, Contact Us, Book Now, Download)",
      "audience": "string (describe the target audience segment for this ad set)"
    }
  ]
}

Rules:
- Exactly 3 ad sets, each targeting a slightly different audience segment
- Primary text must be compelling, story-driven or hook-first
- Headlines must create curiosity or communicate clear value
- CTAs must match the campaign goal: ${goal || 'leads'}
- No placeholder text — make it real and usable for Meta Ads Manager`;

      const message = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1800,
        messages: [{ role: 'user', content: metaPrompt }],
      });

      const content0 = message.content[0];
      const raw = content0?.type === 'text' ? content0.text : '';
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      let metaCampaign: MetaCampaignResult;
      try {
        metaCampaign = JSON.parse(cleaned);
      } catch {
        console.error('[/api/ads/generate] Failed to parse Meta Claude response:', cleaned);
        return NextResponse.json({ error: 'Failed to parse Meta campaign data. Please try again.' }, { status: 500 });
      }

      return NextResponse.json(metaCampaign, { status: 200 });
    }

    // ── Google Ads ────────────────────────────────────────────────────────────
    const googlePrompt = `You are a Google Ads expert. Generate a complete Google Ads campaign for the following business.

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
- Headlines must be compelling and specific to the goal: ${goal || 'leads'}
- No placeholder text — make it real and usable`;

    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: googlePrompt }],
    });

    const content0g = message.content[0];
    const raw = content0g?.type === 'text' ? content0g.text : '';
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
