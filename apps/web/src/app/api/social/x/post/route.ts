import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// X (Twitter) OAuth 1.0a static credentials for @getakai_ai
const X_API_KEY        = process.env.X_API_KEY        ?? 'U38OJMeL9VBMJpvrJceaQ4vJx';
const X_API_SECRET     = process.env.X_API_SECRET     ?? 'AhKOKqNjGjTUK2RljtNFt6z6HyUIGxq12EW07KEQMe1YIUFUxl';
const X_ACCESS_TOKEN   = process.env.X_ACCESS_TOKEN   ?? '1936782514640519168-A4RoT72IsFfcauBJEKEyCGqjZal8wP';
const X_ACCESS_SECRET  = process.env.X_ACCESS_SECRET  ?? '2BOFzM6UhxtG3e3aWuG7VjVRjl67lKvXwFbZsdF2Nnfpl';

function percentEncode(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildPostOAuthHeader(method: string, url: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: X_API_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  // For POST /2/tweets, the body is JSON (not form-encoded), so only oauth params go in signature base
  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(oauthParams[k] ?? '')}`)
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
    const body = await req.json() as { text?: string };

    if (!body.text || typeof body.text !== 'string' || !body.text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const text = body.text.trim();
    if (text.length > 280) {
      return NextResponse.json({ error: 'Tweet exceeds 280 characters' }, { status: 400 });
    }

    const tweetUrl = 'https://api.twitter.com/2/tweets';
    const oauthHeader = buildPostOAuthHeader('POST', tweetUrl);

    const twitterRes = await fetch(tweetUrl, {
      method: 'POST',
      headers: {
        Authorization: oauthHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!twitterRes.ok) {
      const errText = await twitterRes.text();
      console.error('[X/post] Twitter API error:', twitterRes.status, errText);
      return NextResponse.json(
        { error: `Twitter API error: ${twitterRes.status}`, detail: errText },
        { status: 502 }
      );
    }

    const twitterData = await twitterRes.json() as {
      data?: { id: string; text: string };
      errors?: Array<{ message: string }>;
    };

    if (twitterData.errors || !twitterData.data) {
      return NextResponse.json(
        { error: twitterData.errors?.[0]?.message ?? 'Failed to post tweet' },
        { status: 502 }
      );
    }

    const tweetId = twitterData.data.id;
    const tweetLink = `https://twitter.com/getakai_ai/status/${tweetId}`;

    return NextResponse.json({
      success: true,
      tweetId,
      url: tweetLink,
      text: twitterData.data.text,
    });
  } catch (err) {
    console.error('[X/post] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
