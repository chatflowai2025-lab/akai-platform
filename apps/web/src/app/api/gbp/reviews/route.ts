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

export interface GBPReview {
  reviewId: string;
  reviewer: string;
  starRating: number;
  comment: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
  aiReply?: string;
}

// GET — list reviews with AI reply suggestions
export async function GET(req: NextRequest) {
  const uid = await verifyToken(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const locationName = searchParams.get('locationName');

  if (!locationName) {
    return NextResponse.json({ error: 'locationName query param required' }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.data() ?? {};
  const gbp = userData.gbpConnection as { connected?: boolean; accessToken?: string } | undefined;

  if (!gbp?.connected || !gbp.accessToken) {
    return NextResponse.json({ error: 'GBP not connected' }, { status: 403 });
  }

  const reviewsRes = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=10`,
    { headers: { Authorization: `Bearer ${gbp.accessToken}` } }
  );

  if (!reviewsRes.ok) {
    const errText = await reviewsRes.text();
    console.error('[GBP reviews] fetch failed:', errText);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 502 });
  }

  const reviewsData = await reviewsRes.json() as {
    reviews?: {
      reviewId: string;
      reviewer: { displayName?: string };
      starRating: string;
      comment?: string;
      createTime: string;
      updateTime: string;
      reviewReply?: { comment: string; updateTime: string };
    }[];
  };

  const starMap: Record<string, number> = {
    ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
  };

  const rawReviews = reviewsData.reviews ?? [];
  const businessName = userData?.onboarding?.businessName ?? userData?.businessName ?? 'our business';

  // Generate AI reply suggestions in bulk
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let aiReplies: string[] = rawReviews.map(() => '');

  if (apiKey && rawReviews.length > 0) {
    try {
      const client = new Anthropic({ apiKey });
      const reviewsForAI = rawReviews.slice(0, 10).map((r, i) => ({
        index: i,
        stars: starMap[r.starRating] ?? 3,
        comment: r.comment?.slice(0, 300) ?? '',
        reviewer: r.reviewer?.displayName ?? 'Customer',
      }));

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Generate professional, warm reply suggestions for these Google Business Profile reviews for "${businessName}".

Reviews:
${reviewsForAI.map(r => `[${r.index}] ${r.stars}★ from ${r.reviewer}: "${r.comment || '(no comment)'}"`).join('\n')}

For each review, write a reply that:
- Thanks the reviewer by name
- Addresses any specific feedback
- Is 2-3 sentences max
- Sounds human and genuine, not corporate
- For negative reviews, apologises and offers to resolve

Return ONLY a JSON array with exactly ${rawReviews.length} strings, indexed to match:
["reply for review 0", "reply for review 1", ...]`
        }]
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '[]';
      try {
        const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
        aiReplies = JSON.parse(cleaned) as string[];
      } catch { /* use empty strings */ }
    } catch { /* non-fatal */ }
  }

  const reviews: GBPReview[] = rawReviews.map((r, i) => ({
    reviewId: r.reviewId,
    reviewer: r.reviewer?.displayName ?? 'Anonymous',
    starRating: starMap[r.starRating] ?? 3,
    comment: r.comment ?? '',
    createTime: r.createTime,
    updateTime: r.updateTime,
    reviewReply: r.reviewReply,
    aiReply: aiReplies[i] ?? '',
  }));

  return NextResponse.json({ reviews });
}

// POST — publish a reply to a review
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

  const { locationName, reviewId, comment } = await req.json() as {
    locationName: string;
    reviewId: string;
    comment: string;
  };

  if (!locationName || !reviewId || !comment) {
    return NextResponse.json({ error: 'locationName, reviewId, and comment are required' }, { status: 400 });
  }

  const replyRes = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/reviews/${reviewId}/reply`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${gbp.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment }),
    }
  );

  if (!replyRes.ok) {
    const errText = await replyRes.text();
    console.error('[GBP reviews] reply failed:', errText);
    return NextResponse.json({ error: 'Failed to publish reply' }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
