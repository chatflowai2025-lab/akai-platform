export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

// Credentials read from environment variables only — never hardcoded.
// Set GOOGLE_GMAIL_CLIENT_ID and GOOGLE_GMAIL_CLIENT_SECRET in Vercel/Railway.
// Fallback to GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET for existing deployments.
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_GMAIL_CLIENT_ID ??
  process.env.GOOGLE_CLIENT_ID ??
  '';

const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_GMAIL_CLIENT_SECRET ??
  process.env.GOOGLE_CLIENT_SECRET ??
  '';

// ── Types ─────────────────────────────────────────────────────────────────

interface SendEmailBody {
  uid: string;
  to: string;
  subject: string;
  body: string;
}

interface GmailData {
  connected?: boolean;
  accessToken?: string;
  refreshToken?: string;
  email?: string;
}

interface MicrosoftData {
  connected?: boolean;
  provider?: string;
  accessTokenEnc?: string;
  accessToken?: string;
  email?: string;
}

interface TokenRefreshResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GmailSendResponse {
  id?: string;
  error?: { message: string; code: number };
}

interface GraphSendResponse {
  error?: { message: string; code: string };
}

// ── Gmail helpers ─────────────────────────────────────────────────────────

/**
 * Attempt to refresh a Google OAuth access token using the stored refresh token.
 * Returns the new access token, or null on failure.
 */
async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
    const data = (await res.json()) as TokenRefreshResponse;
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Encode an RFC 2822 email message for the Gmail API.
 * Uses base64url (no padding, URL-safe characters).
 */
function encodeEmailForGmail(to: string, from: string, subject: string, body: string): string {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    body,
  ].join('\r\n');

  // btoa works on ASCII; for UTF-8 we encode via TextEncoder / Buffer
  const encoded = Buffer.from(message, 'utf-8').toString('base64');
  // Convert to base64url
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Send an email via the Gmail API.
 * Automatically retries once with a refreshed token if the first attempt returns 401.
 */
async function sendViaGmail(
  gmail: GmailData,
  to: string,
  subject: string,
  body: string,
  uid: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  let accessToken = gmail.accessToken;
  const refreshToken = gmail.refreshToken;
  const fromEmail = gmail.email ?? '';

  if (!accessToken || !refreshToken) {
    return { ok: false, error: 'gmail_no_tokens' };
  }

  const rawMessage = encodeEmailForGmail(to, fromEmail, subject, body);

  const attemptSend = async (token: string): Promise<GmailSendResponse> => {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    });
    return res.json() as Promise<GmailSendResponse>;
  };

  try {
    let result = await attemptSend(accessToken);

    // 401 → refresh token and retry once
    if (result.error?.code === 401 && refreshToken) {
      const newToken = await refreshGoogleToken(refreshToken);
      if (!newToken) return { ok: false, error: 'gmail_token_refresh_failed' };

      // Persist refreshed token to Firestore (best-effort)
      try {
        const db = getAdminFirestore();
        if (db) {
          await db
            .collection('users')
            .doc(uid)
            .set({ gmail: { accessToken: newToken } }, { merge: true });
        }
      } catch (firestoreErr) {
        console.error('[send-email] Firestore token update failed:', firestoreErr);
      }

      accessToken = newToken;
      result = await attemptSend(accessToken);
    }

    if (result.error) {
      return { ok: false, error: result.error.message };
    }

    return { ok: true, messageId: result.id };
  } catch (err) {
    console.error('[send-email] Gmail send error:', err);
    return { ok: false, error: 'gmail_send_exception' };
  }
}

// ── Microsoft Graph helpers ───────────────────────────────────────────────

/**
 * Send an email via Microsoft Graph API.
 * accessTokenEnc is stored as plaintext for now (field name reflects old intent).
 */
async function sendViaMicrosoft(
  ms: MicrosoftData,
  to: string,
  subject: string,
  body: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  // accessTokenEnc field name is legacy — token is stored in plain text
  const accessToken = ms.accessToken ?? ms.accessTokenEnc;

  if (!accessToken) {
    return { ok: false, error: 'microsoft_no_token' };
  }

  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject,
          body: {
            contentType: 'Text',
            content: body,
          },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: true,
      }),
    });

    if (res.status === 202) {
      // 202 Accepted = success, no body
      return { ok: true, messageId: `ms-${Date.now()}` };
    }

    const data = (await res.json().catch(() => ({}))) as GraphSendResponse;
    if (data.error) {
      return { ok: false, error: data.error.message };
    }

    return { ok: true, messageId: `ms-${Date.now()}` };
  } catch (err) {
    console.error('[send-email] Microsoft Graph send error:', err);
    return { ok: false, error: 'microsoft_send_exception' };
  }
}

// ── POST handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: SendEmailBody;

  try {
    body = (await req.json()) as SendEmailBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { uid, to, subject, body: emailBody } = body;

  if (!uid || !to || !subject || !emailBody) {
    return NextResponse.json(
      { error: 'uid, to, subject, and body are required' },
      { status: 400 },
    );
  }

  // Read user's connected inbox from Firestore
  let gmail: GmailData | null = null;
  let microsoft: MicrosoftData | null = null;

  try {
    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({ error: 'firestore_unavailable' }, { status: 503 });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    const data = userDoc.data() ?? {};

    // Check Gmail
    if (data.gmail?.connected === true || data.gmail?.accessToken) {
      gmail = data.gmail as GmailData;
    }

    // Check Microsoft
    if (
      data.inboxConnection?.provider === 'microsoft' ||
      data.inboxConnection?.accessTokenEnc ||
      data.inboxConnection?.accessToken
    ) {
      microsoft = data.inboxConnection as MicrosoftData;
    }
  } catch (err) {
    console.error('[send-email] Firestore read failed:', err);
    return NextResponse.json({ error: 'firestore_read_failed' }, { status: 500 });
  }

  if (!gmail && !microsoft) {
    return NextResponse.json({ error: 'no_inbox_connected' }, { status: 400 });
  }

  // Prefer Gmail; fall back to Microsoft
  if (gmail) {
    const result = await sendViaGmail(gmail, to, subject, emailBody, uid);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, messageId: result.messageId, provider: 'gmail' });
  }

  // Microsoft
  const result = await sendViaMicrosoft(microsoft!, to, subject, emailBody);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, messageId: result.messageId, provider: 'microsoft' });
}
