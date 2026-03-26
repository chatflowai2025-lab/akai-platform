import { NextRequest, NextResponse } from 'next/server';

async function sendEmail(to: string, subject: string, html: string, resendKey: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AKAI <noreply@getakai.ai>',
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, website, phone, businessType, audits } = body;

    if (!email || !website) {
      return NextResponse.json({ error: 'Email and website are required' }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const auditList = Array.isArray(audits) && audits.length > 0
      ? audits.join(', ')
      : 'General audit';

    if (!resendKey) {
      // Mock mode
      console.log(`[health-check] Mock mode — lead from ${email} (${name}), site: ${website}`);
      console.log(`[health-check] Audits requested: ${auditList}`);
      return NextResponse.json({ success: true, message: 'Health check booked (mock)' });
    }

    // Email to the user
    const userHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #D4AF37; margin-bottom: 8px;">Your Free Digital Health Check is Booked ✅</h1>
        <p style="color: #aaa;">Hi ${name || 'there'},</p>
        <p style="color: #aaa;">We've received your request for a free digital health check on <strong style="color:#fff">${website}</strong>.</p>
        <p style="color: #aaa;">Our team will audit the following:</p>
        <ul style="color: #D4AF37;">
          ${Array.isArray(audits) ? audits.map((a: string) => `<li>${a}</li>`).join('') : '<li>General audit</li>'}
        </ul>
        <p style="color: #aaa;">You'll receive your full report within <strong style="color:#fff">24 hours</strong>.</p>
        <p style="color: #aaa;">— The AKAI Team</p>
        <hr style="border-color: #222; margin: 32px 0;" />
        <p style="color: #555; font-size: 12px;">AKAI · AI-Powered Business Automation · getakai.ai</p>
      </div>
    `;

    // Notification to Aaron
    const aaronHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #111; color: #fff; border-radius: 8px;">
        <h2 style="color: #D4AF37;">🔥 New Health Check Lead</h2>
        <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding:6px; color:#aaa; width:140px;">Name</td><td style="padding:6px; color:#fff;">${name || '—'}</td></tr>
          <tr><td style="padding:6px; color:#aaa;">Email</td><td style="padding:6px; color:#fff;"><a href="mailto:${email}" style="color:#D4AF37;">${email}</a></td></tr>
          <tr><td style="padding:6px; color:#aaa;">Website</td><td style="padding:6px; color:#fff;"><a href="${website}" style="color:#D4AF37;">${website}</a></td></tr>
          <tr><td style="padding:6px; color:#aaa;">Phone</td><td style="padding:6px; color:#fff;">${phone || '—'}</td></tr>
          <tr><td style="padding:6px; color:#aaa;">Business type</td><td style="padding:6px; color:#fff;">${businessType || '—'}</td></tr>
          <tr><td style="padding:6px; color:#aaa;">Audits</td><td style="padding:6px; color:#fff;">${auditList}</td></tr>
        </table>
      </div>
    `;

    await Promise.all([
      sendEmail(email, '✅ Your Free Digital Health Check is Booked — AKAI', userHtml, resendKey),
      sendEmail('mrakersten@gmail.com', `🔥 New Health Check Lead: ${name || email}`, aaronHtml, resendKey),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[health-check] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
