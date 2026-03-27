import { NextRequest, NextResponse } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendEmail(to: string, subject: string, html: string) {
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
      from: 'AK at AKAI <ak@getakai.ai>',
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
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:40px 32px;border-radius:16px;">

      <!-- Header -->
      <div style="margin-bottom:32px;">
        <p style="color:#D4AF37;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 12px;">
          AK<span style="color:#fff;">AI</span>
        </p>
        <h1 style="color:#fff;font-size:28px;font-weight:900;margin:0 0 12px;line-height:1.2;">
          Welcome, ${displayName}. 👋<br/>Your AI business partner is ready.
        </h1>
        <p style="color:#888;font-size:15px;margin:0;line-height:1.6;">
          You've just activated AKAI — an AI executive team that runs, grows, and automates your business 24/7.
          Let's get you up and running.
        </p>
      </div>

      <!-- Trial badge -->
      <div style="background:#1a1400;border:1px solid #D4AF37;border-radius:10px;padding:16px 20px;margin:0 0 28px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:22px;">🔥</span>
        <div>
          <p style="color:#D4AF37;font-weight:800;font-size:14px;margin:0 0 2px;">7-day free trial — no card needed</p>
          <p style="color:#888;font-size:12px;margin:0;">Cancel anytime. No setup fees. Full platform access from day one.</p>
        </div>
      </div>

      <!-- Quick start steps -->
      <p style="color:#D4AF37;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">Quick Start — 3 steps</p>

      <div style="background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:20px 24px;margin:0 0 12px;">
        <div style="display:flex;gap:16px;align-items:flex-start;">
          <span style="background:#D4AF37;color:#000;font-weight:900;font-size:12px;min-width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</span>
          <div>
            <p style="color:#fff;font-weight:700;font-size:14px;margin:0 0 4px;">Complete your setup</p>
            <p style="color:#888;font-size:13px;margin:0;line-height:1.5;">
              Tell AK about your business — industry, goals, and location. Takes 2 minutes.
              AK uses this to personalise everything for you.
            </p>
          </div>
        </div>
      </div>

      <div style="background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:20px 24px;margin:0 0 12px;">
        <div style="display:flex;gap:16px;align-items:flex-start;">
          <span style="background:#D4AF37;color:#000;font-weight:900;font-size:12px;min-width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</span>
          <div>
            <p style="color:#fff;font-weight:700;font-size:14px;margin:0 0 4px;">Activate Sales — meet Sophie</p>
            <p style="color:#888;font-size:13px;margin:0;line-height:1.5;">
              Sophie is your AI sales rep. She calls leads, qualifies them, and books meetings — 24/7.
              Connect your calendar and she's ready to work.
            </p>
          </div>
        </div>
      </div>

      <div style="background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:20px 24px;margin:0 0 28px;">
        <div style="display:flex;gap:16px;align-items:flex-start;">
          <span style="background:#D4AF37;color:#000;font-weight:900;font-size:12px;min-width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">3</span>
          <div>
            <p style="color:#fff;font-weight:700;font-size:14px;margin:0 0 4px;">Explore your 9 AI modules</p>
            <p style="color:#888;font-size:13px;margin:0;line-height:1.5;">
              Sales · Voice · Web · Email Guard · Calendar · Proposals · Ads · Social · Recruit.
              Each one runs 24/7 so you don't have to.
            </p>
          </div>
        </div>
      </div>

      <!-- CTA button -->
      <div style="text-align:center;margin:32px 0;">
        <a href="https://getakai.ai/dashboard" style="display:inline-block;background:#D4AF37;color:#000;font-weight:900;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;">
          Go to your dashboard →
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #1f1f1f;margin:32px 0;" />

      <!-- Footer -->
      <p style="color:#555;font-size:12px;text-align:center;margin:0;line-height:1.6;">
        AKAI · AI-Powered Business Automation<br/>
        <a href="https://getakai.ai" style="color:#777;">getakai.ai</a> · Reply to this email anytime
      </p>
    </div>
  `;
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

    if (db) {
      const ref = db.collection('users').doc(uid);
      const snap = await ref.get();

      if (snap.exists && snap.data()?.welcomeEmailSent === true) {
        return NextResponse.json({ ok: true, skipped: true });
      }

      // Mark as sent before sending — prevents race conditions
      await ref.set({ welcomeEmailSent: true }, { merge: true });
    }

    // Send the email
    try {
      await sendEmail(
        email,
        'Welcome to AKAI — your AI business partner is ready 🚀',
        buildWelcomeEmail(name || '', email)
      );
      console.log(`[welcome] Email sent to ${email}`);
    } catch (emailErr) {
      console.error('[welcome] Email send failed (non-fatal):', emailErr);
      // Still return success — don't block the user's dashboard load
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[welcome] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
