export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * Vercel Cron Job: Email Guard Auto-Poll
 * Runs every 5 minutes via vercel.json cron config
 * Fetches all Gmail-connected users from Firebase and triggers email polling
 */

const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app';
const RAILWAY_API_KEY = process.env.NEXT_PUBLIC_RAILWAY_API_KEY || 'aiclozr_api_key_2026_prod';

// Verify this is a legitimate cron request (Vercel sets Authorization header)
function isCronRequest(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  // In production, Vercel sends Authorization: Bearer <CRON_SECRET>
  // If no secret configured, allow (development / first deploy)
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Array<{ userId: string; result: string }> = [];
  let usersPolled = 0;
  let errors = 0;

  try {
    // Get all Gmail-connected users from Firebase via Railway
    // Railway has Firebase Admin access — ask it for connected user IDs
    const usersRes = await fetch(`${RAILWAY_API}/api/email/gmail/connected-users`, {
      headers: { 'x-api-key': RAILWAY_API_KEY },
      signal: AbortSignal.timeout(8000),
    });

    if (usersRes.ok) {
      const { userIds = [] } = await usersRes.json() as { userIds: string[] };

      // Poll each user's inbox (serial to avoid hammering Gmail API)
      for (const userId of userIds) {
        try {
          const pollRes = await fetch(`${RAILWAY_API}/api/email/poll/${userId}`, {
            method: 'POST',
            headers: { 'x-api-key': RAILWAY_API_KEY },
            signal: AbortSignal.timeout(15000),
          });
          const pollData = await pollRes.json() as { ok?: boolean; emailsProcessed?: number; newEnquiries?: number; error?: string };
          results.push({
            userId,
            result: pollData.ok
              ? `ok: ${pollData.emailsProcessed ?? 0} emails, ${pollData.newEnquiries ?? 0} new enquiries`
              : `error: ${pollData.error ?? 'unknown'}`,
          });
          if (!pollData.ok) errors++;
          usersPolled++;
        } catch (err) {
          results.push({ userId, result: `error: ${err instanceof Error ? err.message : 'fetch failed'}` });
          errors++;
          usersPolled++;
        }
      }
    } else {
      // Fallback: if connected-users endpoint not available, poll the known test user
      // This ensures at least the primary account is monitored
      const knownUsers = (process.env.GMAIL_POLL_USER_IDS || '').split(',').filter(Boolean);
      for (const userId of knownUsers) {
        try {
          const pollRes = await fetch(`${RAILWAY_API}/api/email/poll/${userId}`, {
            method: 'POST',
            headers: { 'x-api-key': RAILWAY_API_KEY },
            signal: AbortSignal.timeout(15000),
          });
          const pollData = await pollRes.json() as { ok?: boolean; emailsProcessed?: number; newEnquiries?: number; error?: string };
          results.push({
            userId,
            result: pollData.ok ? `ok: ${pollData.emailsProcessed ?? 0} emails` : `error: ${pollData.error ?? 'unknown'}`,
          });
          usersPolled++;
        } catch (err) {
          results.push({ userId, result: `error: ${err instanceof Error ? err.message : 'fetch failed'}` });
          errors++;
          usersPolled++;
        }
      }
    }
  } catch (err) {
    console.error('[email-poll-cron] Fatal error:', err);
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      duration: Date.now() - startTime,
    }, { status: 500 });
  }

  const duration = Date.now() - startTime;
  console.info(`[email-poll-cron] Polled ${usersPolled} users in ${duration}ms, ${errors} errors`);

  return NextResponse.json({
    ok: true,
    usersPolled,
    errors,
    results,
    duration,
    timestamp: new Date().toISOString(),
  });
}
