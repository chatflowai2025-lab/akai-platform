export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

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
      console.error('[SEO keywords] Firebase Admin not configured');
      return null;
    }
    const decoded = await getAuth(app).verifyIdToken(token);
    return decoded.uid;
  } catch (err) {
    console.error('[SEO keywords] Token verification failed:', err);
    return null;
  }
}

export interface Keyword {
  keyword: string;
  intent: 'informational' | 'commercial' | 'transactional';
  difficulty: 'low' | 'medium' | 'high';
  rationale: string;
}

export async function POST(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { businessType, location } = await req.json() as { businessType: string; location: string };

    if (!businessType?.trim()) {
      return NextResponse.json({ error: 'businessType is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Generate exactly 20 SEO target keywords for a "${businessType}" business${location ? ` located in ${location}` : ''}.

For each keyword, provide:
- keyword: the exact search phrase (2-5 words ideal)
- intent: one of "informational", "commercial", or "transactional"
- difficulty: one of "low", "medium", or "high"
- rationale: one sentence why this keyword matters

Mix local + broader keywords. Include long-tail variations. Prioritise keywords that convert.

Return ONLY a JSON array like this (no markdown, no extra text):
[
  {"keyword": "...", "intent": "transactional", "difficulty": "low", "rationale": "..."},
  ...
]`
      }]
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '[]';
    let keywords: Keyword[] = [];
    try {
      const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
      keywords = JSON.parse(cleaned) as Keyword[];
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Log usage to Firestore
    try {
      const db = getAdminFirestore();
      if (db) {
        await db.doc(`users/${uid}`).set(
          { seoUsage: { keywordSearches: (await db.doc(`users/${uid}`).get()).data()?.seoUsage?.keywordSearches + 1 || 1, lastSearch: new Date().toISOString() } },
          { merge: true }
        );
      }
    } catch { /* non-fatal */ }

    return NextResponse.json({ keywords });
  } catch (err) {
    console.error('[SEO keywords] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
