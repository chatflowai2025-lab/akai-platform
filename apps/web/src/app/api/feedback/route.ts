export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { BETA_WHITELIST } from '@/lib/beta-config';

import { TG_BOT_TOKEN as TG_TOKEN, TG_AARON_CHAT_ID as AARON_CHAT } from '@/lib/server-env';

// Simple in-memory log — persists for the life of the serverless instance
// For durable storage we'd use Firestore, but this works for daily digest
const feedbackLog: Array<{ ts: string; user: string; email: string; type: string; text: string }> = [];

export async function POST(req: NextRequest) {
  try {
    const { feedback, userEmail, type = 'unknown' } = await req.json();
    if (!feedback?.trim()) return NextResponse.json({ error: 'No feedback' }, { status: 400 });

    const userName = BETA_WHITELIST[userEmail as keyof typeof BETA_WHITELIST]?.name || userEmail || 'Unknown';
    const emoji = type === 'bug' ? '🐛' : '💡';
    const label = type === 'bug' ? 'BUG' : 'FEATURE REQUEST';

    // Log it
    feedbackLog.push({ ts: new Date().toISOString(), user: userName, email: userEmail, type, text: feedback });

    // Notify Aaron via Telegram
    const text = `${emoji} *${label}* from ${userName}\n\n${feedback}\n\n_${new Date().toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney' })} AEST_`;
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: AARON_CHAT, text, parse_mode: 'Markdown' }),
    });

    return NextResponse.json({ ok: true, type });
  } catch (err) {
    console.error('[/api/feedback]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// GET /api/feedback — returns the log (for daily digest)
export async function GET() {
  return NextResponse.json({ log: feedbackLog, count: feedbackLog.length });
}
