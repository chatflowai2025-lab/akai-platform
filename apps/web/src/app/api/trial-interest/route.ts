import { NextRequest, NextResponse } from 'next/server';

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8322387252:AAGIi7OYbwfIit4syQA95XWVZCTlPP96oQc';
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8320254721';
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_CuqENxkM_AgFzKPSv3ZLgjqb3wLcZibXi';
const LEAD_NOTIFY_EMAIL = 'chatflowai2025@gmail.com';
const OWNER_NOTIFY_EMAIL = process.env.TRIAL_NOTIFY_EMAIL || 'mrakersten@gmail.com';

async function notifyTelegram(text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch { /* non-fatal */ }
}

async function notifyEmail(params: {
  name: string;
  email: string;
  business: string;
  phone: string;
  industry: string;
  website: string;
}) {
  const { name, email, business, phone, industry, website } = params;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AKAI <onboarding@resend.dev>',
        to: [LEAD_NOTIFY_EMAIL, OWNER_NOTIFY_EMAIL],
        subject: `🔥 New Trial Request — ${name || email}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px;">
            <h2 style="color:#D4AF37;margin:0 0 24px;">🔥 New Trial Request</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="color:#888;padding:8px 0;width:140px;vertical-align:top;">First Name</td><td style="color:#fff;">${name || '—'}</td></tr>
              <tr><td style="color:#888;padding:8px 0;vertical-align:top;">Business</td><td style="color:#fff;">${business || '—'}</td></tr>
              <tr><td style="color:#888;padding:8px 0;vertical-align:top;">Email</td><td style="color:#fff;">${email}</td></tr>
              <tr><td style="color:#888;padding:8px 0;vertical-align:top;">Phone</td><td style="color:#fff;">${phone || '—'}</td></tr>
              <tr><td style="color:#888;padding:8px 0;vertical-align:top;">Industry</td><td style="color:#fff;">${industry || '—'}</td></tr>
              <tr><td style="color:#888;padding:8px 0;vertical-align:top;">Website</td><td style="color:#fff;">${website ? `<a href="${website}" style="color:#D4AF37;">${website}</a>` : '—'}</td></tr>
            </table>
            <div style="margin-top:24px;">
              <a href="mailto:${email}" style="background:#D4AF37;color:#000;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">
                Reply to ${name || 'them'} →
              </a>
            </div>
          </div>`,
      }),
    });
  } catch { /* non-fatal */ }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, business, phone, industry, website } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const msg = `🔥 <b>New Trial Request</b>\n\n👤 ${name || 'Unknown'}\n📧 ${email}\n🏢 ${business || '—'}\n📞 ${phone || '—'}\n🏭 ${industry || '—'}\n🌐 ${website || '—'}`;

    await Promise.allSettled([
      notifyTelegram(msg),
      notifyEmail({ name, email, business, phone, industry, website }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
