import { NextRequest, NextResponse } from 'next/server';
import { BETA_WHITELIST } from '@/lib/beta-config';

const TG_TOKEN = '8322387252:AAGIi7OYbwfIit4syQA95XWVZCTlPP96oQc';
const AARON_CHAT = '8320254721';

export async function POST(req: NextRequest) {
  try {
    const { feedback, userEmail, type = 'unknown' } = await req.json();

    if (!feedback?.trim()) {
      return NextResponse.json({ error: 'No feedback provided' }, { status: 400 });
    }

    const userName = BETA_WHITELIST[userEmail as keyof typeof BETA_WHITELIST]?.name || userEmail || 'Unknown';
    const emoji = type === 'bug' ? '🐛' : type === 'feature' ? '💡' : '💬';
    const label = type === 'bug' ? 'BUG REPORT' : type === 'feature' ? 'FEATURE REQUEST' : 'FEEDBACK';

    const text = `${emoji} *${label}*\n\n*From:* ${userName} (${userEmail})\n\n${feedback}\n\n_via getakai.ai_`;

    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: AARON_CHAT,
        text,
        parse_mode: 'Markdown',
      }),
    });

    return NextResponse.json({ ok: true, type });
  } catch (err) {
    console.error('[/api/feedback]', err);
    return NextResponse.json({ error: 'Failed to send feedback' }, { status: 500 });
  }
}
