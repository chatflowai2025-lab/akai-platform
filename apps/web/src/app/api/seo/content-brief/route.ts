export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const runtime = 'nodejs';

function getAdminApp(): App | null {
  const existing = getApps().find(a => a.name === 'admin');
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return initializeApp(
      { credential: cert({ projectId, clientEmail, privateKey }), projectId },
      'admin'
    );
  }
  return null;
}

async function verifyToken(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    const app = getAdminApp();
    if (!app) {
      console.error('[SEO content-brief] Firebase Admin not configured');
      return null;
    }
    const decoded = await getAuth(app).verifyIdToken(token);
    return decoded.uid;
  } catch (err) {
    console.error('[SEO content-brief] Token verification failed:', err);
    return null;
  }
}

export interface ContentBrief {
  keyword: string;
  title: string;
  metaDescription: string;
  wordCountTarget: number;
  h2Structure: { heading: string; notes: string }[];
  semanticKeywords: string[];
  cta: string;
  contentGoal: string;
  targetAudience: string;
}

export async function POST(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { keyword, businessType, location } = await req.json() as {
      keyword: string;
      businessType?: string;
      location?: string;
    };

    if (!keyword?.trim()) {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: `Create a full SEO content brief for the target keyword: "${keyword}"
${businessType ? `Business type: ${businessType}` : ''}
${location ? `Location: ${location}` : ''}

Return ONLY this JSON (no markdown, no extra text):
{
  "keyword": "${keyword}",
  "title": "<SEO-optimised page title 50-60 chars, include keyword>",
  "metaDescription": "<compelling meta description 120-155 chars, include keyword + CTA>",
  "wordCountTarget": <recommended word count as integer, typically 800-2000>,
  "h2Structure": [
    {"heading": "<H2 heading>", "notes": "<what to cover in this section, 1-2 sentences>"},
    ... (5-7 H2s)
  ],
  "semanticKeywords": ["<related keyword 1>", "<related keyword 2>", ... (10-15 terms)],
  "cta": "<strong call to action phrase, 5-10 words>",
  "contentGoal": "<one sentence — what this content should achieve for the business>",
  "targetAudience": "<one sentence describing who this content is for>"
}`
      }]
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '{}';
    let brief: ContentBrief;
    try {
      const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
      brief = JSON.parse(cleaned) as ContentBrief;
    } catch {
      return NextResponse.json({ error: 'Failed to parse content brief' }, { status: 500 });
    }

    return NextResponse.json({ brief });
  } catch (err) {
    console.error('[SEO content-brief] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
