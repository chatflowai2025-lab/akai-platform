import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_EMAIL = 'mrakersten@gmail.com';
const TG_TOKEN = '8322387252:AAGIi7OYbwfIit4syQA95XWVZCTlPP96oQc';
const TG_CHAT = '8320254721';

export async function POST(req: NextRequest) {
  try {
    const { feedback, userEmail } = await req.json();

    if (userEmail !== ALLOWED_EMAIL) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
    }

    if (!feedback?.trim()) {
      return NextResponse.json({ error: 'No feedback provided' }, { status: 400 });
    }

    const text = `🔧 *AKAI Feedback from Aaron*\n\n${feedback}\n\n_via getakai.ai chat_`;

    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'Markdown' }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/feedback]', err);
    return NextResponse.json({ error: 'Failed to send feedback' }, { status: 500 });
  }
}
