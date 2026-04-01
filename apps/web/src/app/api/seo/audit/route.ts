import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';

export const runtime = 'nodejs';

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

interface AuditSignals {
  hasTitle: boolean;
  titleLength: number;
  titleText: string;
  hasMetaDesc: boolean;
  metaDescLength: number;
  metaDescText: string;
  h1Count: number;
  h1Text: string;
  imagesTotal: number;
  imagesWithAlt: number;
  internalLinks: number;
  hasSchema: boolean;
  wordCount: number;
  loadTimeSignal: string;
}

async function fetchPageSignals(url: string): Promise<AuditSignals> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let html = '';
  let loadTimeSignal = 'unknown';
  try {
    const start = Date.now();
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AKAI-SEO-Audit/1.0' },
    });
    loadTimeSignal = Date.now() - start > 3000 ? 'slow (>3s)' : Date.now() - start > 1500 ? 'moderate (1.5-3s)' : 'fast (<1.5s)';
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  // Parse key SEO signals with regex (no DOM parser in edge/node)
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = titleMatch ? (titleMatch[1] ?? '').replace(/<[^>]+>/g, '').trim() : '';

  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const metaDescText = metaDescMatch ? (metaDescMatch[1] ?? '').trim() : '';

  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const h1Text = h1Matches[0]?.replace(/<[^>]+>/g, '').trim() || '';

  const imgTags = html.match(/<img[^>]+>/gi) || [];
  const imagesWithAlt = imgTags.filter(img => /alt=["'][^"']+["']/i.test(img)).length;

  const internalLinks = (html.match(/<a[^>]+href=["']\/[^"']*["']/gi) || []).length;

  const hasSchema = html.includes('application/ld+json') || html.includes('itemscope') || html.includes('schema.org');

  const bodyText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = bodyText.split(/\s+/).length;

  return {
    hasTitle: !!titleText,
    titleLength: titleText.length,
    titleText: titleText.slice(0, 100),
    hasMetaDesc: !!metaDescText,
    metaDescLength: metaDescText.length,
    metaDescText: metaDescText.slice(0, 200),
    h1Count: h1Matches.length,
    h1Text: h1Text.slice(0, 100),
    imagesTotal: imgTags.length,
    imagesWithAlt,
    internalLinks,
    hasSchema,
    wordCount,
    loadTimeSignal,
  };
}

export interface AuditResult {
  url: string;
  score: number;
  signals: AuditSignals;
  fixes: { priority: number; issue: string; fix: string }[];
  summary: string;
}

export async function POST(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { url } = await req.json() as { url: string };
    if (!url?.trim()) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;

    // Fetch page signals
    let signals: AuditSignals;
    try {
      signals = await fetchPageSignals(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Could not fetch page — check the URL is publicly accessible' }, { status: 422 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are an expert SEO auditor. Analyse these on-page SEO signals for ${targetUrl}:

Title: "${signals.titleText}" (${signals.titleLength} chars, ${signals.hasTitle ? 'present' : 'MISSING'})
Meta description: "${signals.metaDescText}" (${signals.metaDescLength} chars, ${signals.hasMetaDesc ? 'present' : 'MISSING'})
H1: "${signals.h1Text}" (${signals.h1Count} found)
Images: ${signals.imagesTotal} total, ${signals.imagesWithAlt} with alt text
Internal links: ${signals.internalLinks}
Schema markup: ${signals.hasSchema ? 'present' : 'NOT FOUND'}
Page word count: ${signals.wordCount}
Load time signal: ${signals.loadTimeSignal}

Scoring guidelines (max 100):
- Title (20pts): present=10, 50-60 chars=10
- Meta desc (20pts): present=10, 120-160 chars=10
- H1 (15pts): exactly one=15, zero or multiple=0
- Image alt (15pts): all images have alt=15, >80%=10, <80%=5
- Internal links (10pts): >5 links=10, 1-5=5, 0=0
- Schema (10pts): present=10, absent=0
- Content length (10pts): >300 words=10

Calculate the total score. Then return ONLY this JSON (no markdown):
{
  "score": <number 0-100>,
  "fixes": [
    {"priority": 1, "issue": "...", "fix": "..."},
    {"priority": 2, "issue": "...", "fix": "..."},
    {"priority": 3, "issue": "...", "fix": "..."},
    {"priority": 4, "issue": "...", "fix": "..."},
    {"priority": 5, "issue": "...", "fix": "..."}
  ],
  "summary": "One sentence overall assessment."
}`
      }]
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '{}';
    let aiResult: { score: number; fixes: AuditResult['fixes']; summary: string };
    try {
      const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
      aiResult = JSON.parse(cleaned) as typeof aiResult;
    } catch {
      return NextResponse.json({ error: 'Failed to parse audit result' }, { status: 500 });
    }

    const result: AuditResult = {
      url: targetUrl,
      score: aiResult.score,
      signals,
      fixes: aiResult.fixes,
      summary: aiResult.summary,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[SEO audit] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
