import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
import { getAdminFirestore } from '@/lib/firebase-admin';

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

export interface GBPPost {
  summary: string;
  callToActionType: string;
  callToActionUrl?: string;
  topicType: 'STANDARD' | 'EVENT' | 'OFFER';
  eventTitle?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  offerTitle?: string;
}

// GET — generate AI post suggestions
export async function GET(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.data() ?? {};
  const industry = userData?.onboarding?.industry ?? userData?.industry ?? 'business';
  const businessName = userData?.onboarding?.businessName ?? userData?.businessName ?? 'your business';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Generate 5 Google Business Profile post ideas for "${businessName}", a ${industry} business.

Each idea should be ready to post with specific copy. Mix post types: What's New, Offer, Event.

Return ONLY this JSON array (no markdown):
[
  {
    "topicType": "STANDARD",
    "summary": "<post copy, 150-300 chars, engaging and specific>",
    "callToActionType": "CALL" or "BOOK" or "LEARN_MORE" or "SIGN_UP" or "ORDER",
    "eventTitle": null,
    "offerTitle": null
  },
  {
    "topicType": "OFFER",
    "summary": "<offer post copy>",
    "callToActionType": "CALL",
    "offerTitle": "<short offer name>"
  },
  ...5 total posts
]`
    }]
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '[]';
  let suggestions: GBPPost[] = [];
  try {
    const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    suggestions = JSON.parse(cleaned) as GBPPost[];
  } catch {
    suggestions = [];
  }

  return NextResponse.json({ suggestions });
}

// POST — publish a post to GBP
export async function POST(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.data() ?? {};
  const gbp = userData.gbpConnection as { connected?: boolean; accessToken?: string } | undefined;

  if (!gbp?.connected || !gbp.accessToken) {
    return NextResponse.json({ error: 'GBP not connected' }, { status: 403 });
  }

  const { post, locationName } = await req.json() as { post: GBPPost; locationName: string };
  if (!post?.summary || !locationName) {
    return NextResponse.json({ error: 'post and locationName are required' }, { status: 400 });
  }

  // Build GBP post payload
  interface PostPayload {
    summary: string;
    topicType: string;
    callToAction?: { actionType: string; url?: string };
    event?: {
      title: string;
      schedule: { startDate: { year: number; month: number; day: number }; endDate: { year: number; month: number; day: number } };
    };
    offer?: { couponCode?: string; redeemOnlineUrl?: string; termsConditions?: string };
  }
  const payload: PostPayload = {
    summary: post.summary,
    topicType: post.topicType,
  };

  if (post.callToActionType) {
    payload.callToAction = { actionType: post.callToActionType };
    if (post.callToActionUrl) payload.callToAction.url = post.callToActionUrl;
  }

  if (post.topicType === 'EVENT' && post.eventTitle) {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    payload.event = {
      title: post.eventTitle,
      schedule: {
        startDate: { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() },
        endDate: { year: end.getFullYear(), month: end.getMonth() + 1, day: end.getDate() },
      },
    };
  }

  if (post.topicType === 'OFFER' && post.offerTitle) {
    payload.offer = {};
  }

  const publishRes = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gbp.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!publishRes.ok) {
    const errText = await publishRes.text();
    console.error('[GBP posts] publish failed:', errText);
    return NextResponse.json({ error: 'Failed to publish post' }, { status: 502 });
  }

  const result = await publishRes.json();
  return NextResponse.json({ success: true, post: result });
}
