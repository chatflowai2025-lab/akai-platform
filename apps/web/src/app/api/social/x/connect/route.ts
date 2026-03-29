import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// X (Twitter) OAuth 1.0a static credentials for @getakai_ai
const X_API_KEY        = process.env.X_API_KEY        ?? 'xPUex2YS1zSkKB5zNurC9uVLf';
const X_API_SECRET     = process.env.X_API_SECRET     ?? '0yew7vWaIgSBQY7SBZxMtHZrBBwu5p6rPgphHrQQgTyiFu1cv1';
const X_ACCESS_TOKEN   = process.env.X_ACCESS_TOKEN   ?? '1936782514640519168-rqS3UspiWUX3bdf3tVyfGjBHKbAV8W';
const X_ACCESS_SECRET  = process.env.X_ACCESS_SECRET  ?? 'zCtnKASQbZyBrHBlW6BVMhk1Lchl80DnTJPbmgb1qesma';

function percentEncode(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildOAuthHeader(method: string, url: string, extraParams: Record<string, string> = {}): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: X_API_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: '1.0',
    ...extraParams,
  };

  // Merge all params for signature base (no extra params for GET /2/users/me)
  const allParams = { ...oauthParams };
  const sortedParams = Object.keys(allParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k] ?? '')}`)
    .join('&');

  const sigBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join('&');

  const signingKey = `${percentEncode(X_API_SECRET)}&${percentEncode(X_ACCESS_SECRET)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(sigBase).digest('base64');

  oauthParams['oauth_signature'] = signature;

  const headerParts = Object.keys(oauthParams)
    .filter(k => k.startsWith('oauth_'))
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k] ?? '')}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { uid?: string };
    const uid = body.uid;

    // Call Twitter API v2 /2/users/me to validate credentials
    const url = 'https://api.twitter.com/2/users/me';
    const fields = 'public_metrics,profile_image_url,description';
    const fullUrl = `${url}?user.fields=${fields}`;

    const oauthHeader = buildOAuthHeader('GET', url);

    const twitterRes = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        Authorization: oauthHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!twitterRes.ok) {
      const errText = await twitterRes.text();
      console.error('[X/connect] Twitter API error:', twitterRes.status, errText);
      return NextResponse.json(
        { error: `Twitter API error: ${twitterRes.status}` },
        { status: 502 }
      );
    }

    const twitterData = await twitterRes.json() as {
      data?: {
        id: string;
        name: string;
        username: string;
        profile_image_url?: string;
        public_metrics?: { followers_count: number; following_count: number; tweet_count: number };
        description?: string;
      };
      errors?: Array<{ message: string }>;
    };

    if (twitterData.errors || !twitterData.data) {
      return NextResponse.json(
        { error: twitterData.errors?.[0]?.message ?? 'Failed to fetch account info' },
        { status: 502 }
      );
    }

    const account = twitterData.data;
    const connectionInfo = {
      connected: true,
      username: account.username,
      name: account.name,
      profileImageUrl: account.profile_image_url ?? null,
      followersCount: account.public_metrics?.followers_count ?? 0,
      followingCount: account.public_metrics?.following_count ?? 0,
      tweetCount: account.public_metrics?.tweet_count ?? 0,
      connectedAt: FieldValue.serverTimestamp(),
    };

    // Save to Firestore if uid provided
    if (uid) {
      try {
        const db = getAdminFirestore();
        if (db) {
          await db
            .collection('users')
            .doc(uid)
            .collection('socialConnections')
            .doc('x')
            .set(connectionInfo);
        }
      } catch (fsErr) {
        console.error('[X/connect] Firestore write error:', fsErr);
        // Non-fatal — return success anyway
      }
    }

    return NextResponse.json({
      success: true,
      account: {
        username: account.username,
        name: account.name,
        profileImageUrl: account.profile_image_url,
        followersCount: account.public_metrics?.followers_count ?? 0,
      },
    });
  } catch (err) {
    console.error('[X/connect] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
