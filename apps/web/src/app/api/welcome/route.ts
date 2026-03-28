import { NextRequest, NextResponse } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendEmail(to: string, subject: string, html: string) {
  // Try Railway SMTP relay first (proven working, uses Gmail SMTP)
  try {
    const railwayUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app';
    const res = await fetch(`${railwayUrl}/api/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.RAILWAY_API_KEY || '' },
      body: JSON.stringify({ to, subject, html }),
    });
    if (res.ok) {
      console.log(`[welcome] Sent via Railway SMTP to ${to}`);
      return;
    }
    console.warn('[welcome] Railway SMTP failed, falling back to Resend:', await res.text());
  } catch (e) {
    console.warn('[welcome] Railway SMTP error, falling back to Resend:', e);
  }

  // Fallback: Resend
  if (!RESEND_API_KEY) {
    console.log(`[welcome] Mock mode — would send to ${to}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Aaron at AKAI <onboarding@resend.dev>',
      reply_to: 'AK at AKAI <chatflowai2025@gmail.com>',
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

function buildWelcomeEmail(name: string, email: string): string {
  const displayName = name || email.split('@')[0] || 'there';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header bar -->
    <div style="background:#0a0a0a;padding:28px 40px;text-align:center;">
      <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px;">
        <span style="color:#ffffff;">AK</span><span style="color:#D4AF37;">AI</span>
      </p>
      <p style="margin:6px 0 0;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Your AI Business Partner</p>
    </div>

    <!-- Body -->
    <div style="padding:40px;">
      <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600;">Hi ${displayName},</p>
      <h1 style="font-size:24px;font-weight:900;color:#0a0a0a;margin:0 0 16px;line-height:1.3;">
        Welcome to AKAI. Your account is live.
      </h1>
      <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 28px;">
        You now have access to 10 AI agents built to handle your sales pipeline, email, calendar, and more — 24 hours a day. Aaron from AKAI will be reaching out personally to help you get set up and make the most of your trial.
      </p>

      <!-- Trial callout -->
      <div style="background:#fffbeb;border-left:4px solid #D4AF37;border-radius:4px;padding:16px 20px;margin:0 0 32px;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#92400e;">14-day free trial — no credit card required</p>
        <p style="margin:4px 0 0;font-size:13px;color:#78350f;">Full platform access. Cancel anytime. No setup fees.</p>
      </div>

      <!-- What's working now -->
      <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#D4AF37;margin:0 0 12px;">What to focus on first</p>

      <table style="width:100%;border-collapse:collapse;margin:0 0 28px;">
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;width:36px;">
            <span style="display:inline-block;width:28px;height:28px;background:#0a0a0a;border-radius:50%;text-align:center;line-height:28px;font-size:12px;font-weight:900;color:#D4AF37;">1</span>
          </td>
          <td style="padding:14px 0 14px 14px;border-bottom:1px solid #f0f0f0;">
            <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#111;">Sales — your lead pipeline</p>
            <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">Upload your first leads and let AKAI start tracking and actioning them. This is where revenue comes from.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
            <span style="display:inline-block;width:28px;height:28px;background:#0a0a0a;border-radius:50%;text-align:center;line-height:28px;font-size:12px;font-weight:900;color:#D4AF37;">2</span>
          </td>
          <td style="padding:14px 0 14px 14px;border-bottom:1px solid #f0f0f0;">
            <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#111;">Email Guard — connect your inbox</p>
            <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">Connect your Gmail or Outlook account and AKAI will monitor, route, and action inbound enquiries automatically.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 0;vertical-align:top;">
            <span style="display:inline-block;width:28px;height:28px;background:#0a0a0a;border-radius:50%;text-align:center;line-height:28px;font-size:12px;font-weight:900;color:#D4AF37;">3</span>
          </td>
          <td style="padding:14px 0 14px 14px;">
            <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#111;">Calendar — sync your schedule</p>
            <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">Connect Google Calendar or Outlook Calendar so AKAI can see your availability and book meetings on your behalf.</p>
          </td>
        </tr>
      </table>

      <!-- Sign in options note -->
      <div style="background:#f8f8f8;border-radius:6px;padding:16px 20px;margin:0 0 28px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#111;">Signing in</p>
        <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
          You can sign in with <strong>Google</strong> or <strong>Microsoft</strong> at <a href="https://getakai.ai/login" style="color:#D4AF37;text-decoration:none;font-weight:600;">getakai.ai/login</a>. Use the same account you signed up with to access your dashboard.
        </p>
      </div>

      <!-- Brain / evolution section -->
      <div style="background:#0a0a0a;border-radius:8px;padding:24px;margin:0 0 24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:1px;">🧠 How AKAI gets smarter</p>
        <p style="margin:0 0 12px;font-size:13px;color:#aaa;line-height:1.7;">
          AKAI has a central brain that learns from every interaction — every email replied to, every lead called, every meeting booked. The more you use it, the more it understands your business, your customers, and what actually converts.
        </p>
        <p style="margin:0;font-size:13px;color:#aaa;line-height:1.7;">
          Over time it spots patterns you'd never see manually — which leads respond, what time of day works best, which message angles convert. It adapts automatically. You just keep working.
        </p>
      </div>

      <!-- Trailblazer feedback section -->
      <div style="background:#fffbeb;border-left:4px solid #D4AF37;border-radius:4px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#92400e;">You're a Trailblazer — your feedback shapes the platform</p>
        <p style="margin:0 0 10px;font-size:13px;color:#78350f;line-height:1.6;">
          As an early tester, what you find and report directly changes what gets built next. Two ways to give feedback:
        </p>
        <p style="margin:0 0 6px;font-size:13px;color:#78350f;"><strong>1. Reply to this email</strong> — AK picks it up and responds. Anything needing Aaron gets escalated to him directly.</p>
        <p style="margin:0;font-size:13px;color:#78350f;"><strong>2. Tell AK in the dashboard</strong> — type your feedback in the chat, AK responds instantly and logs it for review.</p>
      </div>

      <!-- Report issues -->
      <div style="background:#f8f8f8;border-radius:6px;padding:16px 20px;margin:0 0 32px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#111;">Found something that's not right?</p>
        <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
          Reply to this email with what happened and what you expected. AK picks up all replies and responds — anything serious gets escalated to Aaron directly. You'll hear back fast.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:0 0 32px;">
        <a href="https://getakai.ai/dashboard" style="display:inline-block;background:#D4AF37;color:#000000;font-weight:800;font-size:15px;padding:14px 40px;border-radius:8px;text-decoration:none;letter-spacing:-0.3px;">
          Open your dashboard →
        </a>
        <p style="margin:12px 0 0;font-size:12px;color:#999;">
          <a href="https://getakai.ai/dashboard" style="color:#999;">https://getakai.ai/dashboard</a>
        </p>
      </div>

      <hr style="border:none;border-top:1px solid #eeeeee;margin:0 0 24px;">

      <p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 8px;">
        Talk soon,<br>
        <strong style="color:#111;">Aaron Kersten</strong><br>
        Founder, AKAI
      </p>
      <p style="font-size:12px;color:#999;margin:0;">
        <a href="https://getakai.ai" style="color:#999;text-decoration:none;">getakai.ai</a> · Reply anytime — AK responds 24/7
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8f8f8;padding:16px 40px;text-align:center;border-top:1px solid #eeeeee;">
      <p style="margin:0;font-size:11px;color:#aaa;">
        AKAI · AI-Powered Business Automation · Sydney, Australia<br>
        You're receiving this because you signed up for a free trial at getakai.ai
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * POST /api/welcome
 *
 * Called client-side on first dashboard load when user has no welcomeEmailSent flag.
 * Body: { uid: string, email: string, name?: string }
 *
 * One-time only — checks and sets users/{uid}.welcomeEmailSent in Firestore.
 */
export async function POST(req: NextRequest) {
  try {
    const { uid, email, name } = await req.json();

    if (!uid || !email) {
      return NextResponse.json({ error: 'uid and email are required' }, { status: 400 });
    }


    // Guard: only send once per user
    let db: Firestore | null = null;
    try {
      db = getAdminFirestore();
    } catch (err) {
      console.warn('[welcome] Firestore admin not available:', err);
    }

    // Check + mark welcomeEmailSent in Firestore (non-fatal if Firestore unavailable)
    if (db) {
      try {
        const ref = db.collection('users').doc(uid);
        const snap = await ref.get();
        if (snap.exists && snap.data()?.welcomeEmailSent === true) {
          return NextResponse.json({ ok: true, skipped: true });
        }
        await ref.set({ welcomeEmailSent: true }, { merge: true });
      } catch (fsErr) {
        console.warn('[welcome] Firestore check failed (continuing anyway):', fsErr);
      }
    }

    // Send the email — always attempt even if Firestore failed
    try {
      await sendEmail(
        email,
        'Your AKAI account is live — here\'s where to start',
        buildWelcomeEmail(name || '', email)
      );
      console.log(`[welcome] Email sent to ${email}`);
    } catch (emailErr) {
      console.error('[welcome] Email send failed:', emailErr);
      // Still return success — don't block the user's dashboard load
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[welcome] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
