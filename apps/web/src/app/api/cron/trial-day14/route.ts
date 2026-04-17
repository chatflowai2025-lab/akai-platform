export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { TRIAL_MODE_ACTIVE } from '@/lib/beta-config';

/**
 * GET /api/cron/trial-day14
 *
 * Daily cron — finds all users whose trial started exactly 14 days ago
 * and sends a personalised "here's what AKAI did for you" conversion email.
 *
 * Respects TRIAL_MODE_ACTIVE: is a no-op when the trial system is dormant.
 * Trailblazers never receive this email (they have no trialStartedAt).
 *
 * Intended to be called by an OpenClaw cron job once per day.
 */

const RAILWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app';
const RAILWAY_API_KEY = process.env.NEXT_PUBLIC_RAILWAY_API_KEY || 'aiclozr_api_key_2026_prod';

function isCronRequest(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // dev / first deploy
  return authHeader === `Bearer ${cronSecret}`;
}

interface ActivityLog {
  sophieCalls?: number;
  leadsUploaded?: number;
  emailsProcessed?: number;
  modulesUsed?: string[];
}

async function getUserActivity(uid: string): Promise<ActivityLog> {
  const db = getAdminFirestore();
  if (!db) return {};

  try {
    // Pull the last 14 days of activityLog subcollection
    const { Timestamp } = await import('firebase-admin/firestore');
    const cutoff = new Date(Date.now() - 14 * 86400000);
    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('activityLog')
      .where('timestamp', '>=', cutoff.toISOString())
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get();

    let sophieCalls = 0;
    let leadsUploaded = 0;
    let emailsProcessed = 0;
    const modulesSet = new Set<string>();

    for (const doc of snap.docs) {
      const d = doc.data();
      const event = (d.event as string) || (d.type as string) || '';
      if (event === 'demo_call_triggered' || event === 'voice_page_viewed') sophieCalls++;
      if (event === 'leads_uploaded') leadsUploaded += (d.data?.count as number) || 1;
      if (event === 'email_guard_connected' || event === 'email_guard_connect_clicked') emailsProcessed++;
      // Track which modules were visited
      const moduleName = (d.data?.module as string) || (d.currentModule as string) || '';
      if (moduleName) modulesSet.add(moduleName);
      if (event.includes('dashboard')) modulesSet.add('dashboard');
      if (event.includes('calendar')) modulesSet.add('calendar');
      if (event.includes('email')) modulesSet.add('email-guard');
      if (event.includes('voice')) modulesSet.add('voice');
      if (event.includes('sales') || event.includes('leads')) modulesSet.add('sales');
      if (event.includes('social') || event.includes('cmo')) modulesSet.add('social');
    }

    void Timestamp; // suppress unused import warning
    return {
      sophieCalls,
      leadsUploaded,
      emailsProcessed,
      modulesUsed: [...modulesSet].slice(0, 6),
    };
  } catch {
    return {};
  }
}

function buildDay14Email(params: {
  name: string;
  email: string;
  businessName: string;
  activity: ActivityLog;
}): string {
  const { name, email, businessName, activity } = params;
  const displayName = name || email.split('@')[0] || 'there';
  const biz = businessName || 'your business';

  const sophieCallsLine = activity.sophieCalls && activity.sophieCalls > 0
    ? `<li style="margin:0 0 8px;font-size:14px;color:#e5e7eb;">📞 <strong>${activity.sophieCalls}</strong> demo call${activity.sophieCalls !== 1 ? 's' : ''} triggered by Sophie</li>`
    : '';
  const leadsLine = activity.leadsUploaded && activity.leadsUploaded > 0
    ? `<li style="margin:0 0 8px;font-size:14px;color:#e5e7eb;">🎯 <strong>${activity.leadsUploaded}</strong> lead${activity.leadsUploaded !== 1 ? 's' : ''} uploaded and tracked</li>`
    : '';
  const emailsLine = activity.emailsProcessed && activity.emailsProcessed > 0
    ? `<li style="margin:0 0 8px;font-size:14px;color:#e5e7eb;">✉️ Email Guard active — inbox monitored for ${biz}</li>`
    : '';
  const modulesLine = activity.modulesUsed && activity.modulesUsed.length > 0
    ? `<li style="margin:0 0 8px;font-size:14px;color:#e5e7eb;">🧠 Modules explored: <strong>${activity.modulesUsed.join(', ')}</strong></li>`
    : '';

  const activityItems = [sophieCallsLine, leadsLine, emailsLine, modulesLine].filter(Boolean).join('\n          ');
  const hasActivity = activityItems.trim().length > 0;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#0a0a0a;padding:28px 40px;text-align:center;">
      <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px;">
        <span style="color:#ffffff;">AK</span><span style="color:#D4AF37;">AI</span>
      </p>
      <p style="margin:6px 0 0;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Your AI Business Partner</p>
    </div>

    <!-- Body -->
    <div style="padding:40px;">
      <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:600;">Hi ${displayName},</p>

      <h1 style="font-size:22px;font-weight:900;color:#0a0a0a;margin:0 0 16px;line-height:1.3;">
        Your trial ends tomorrow — here's what AKAI did for ${biz} in 14 days
      </h1>

      <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 24px;">
        You've had your full AI executive team running for 14 days. Here's a summary of what's been happening:
      </p>

      <!-- Activity summary -->
      <div style="background:#0a0a0a;border-radius:10px;padding:24px;margin:0 0 28px;">
        <p style="margin:0 0 14px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#D4AF37;">📊 What AKAI did for you</p>
        ${hasActivity
          ? `<ul style="margin:0;padding:0 0 0 0;list-style:none;">${activityItems}</ul>`
          : `<p style="margin:0;font-size:14px;color:#6b7280;line-height:1.7;">Your account is set up and your AI team is ready. Subscribe to see AKAI work at full capacity — lead gen, email guard, voice calls, proposals, and more.</p>`
        }
      </div>

      <!-- Trial urgency -->
      <div style="background:#fffbeb;border-left:4px solid #D4AF37;border-radius:4px;padding:16px 20px;margin:0 0 28px;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#92400e;">⏰ Your trial ends tomorrow</p>
        <p style="margin:0;font-size:13px;color:#78350f;line-height:1.7;">
          Your agents pause at the end of day 15. Your data stays safe. Subscribe and they restart instantly.
        </p>
      </div>

      <!-- What continues -->
      <div style="background:#f8f8f8;border-radius:8px;padding:20px 24px;margin:0 0 28px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111;">What's included from $199/mo</p>
        <table style="width:100%;border-collapse:collapse;">
          ${[
            ['Sophie', 'AI voice agent — calls and qualifies leads 24/7'],
            ['Email Guard', 'Monitors inbox, routes leads, sends proposals'],
            ['CMO / Social', 'Generates and schedules content autonomously'],
            ['Sales Pipeline', 'Tracks every lead from first contact to close'],
            ['Web Agent', 'Builds and optimises your digital presence'],
            ['Calendar', 'Books meetings directly into your calendar'],
          ].map(([name, desc]) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;width:120px;">
              <span style="font-size:13px;font-weight:700;color:#111;">${name}</span>
            </td>
            <td style="padding:8px 0 8px 16px;border-bottom:1px solid #e5e7eb;">
              <span style="font-size:13px;color:#555;">${desc}</span>
            </td>
          </tr>`).join('')}
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:0 0 32px;">
        <a href="https://getakai.ai/dashboard" style="display:inline-block;background:#D4AF37;color:#000000;font-weight:800;font-size:16px;padding:16px 48px;border-radius:8px;text-decoration:none;letter-spacing:-0.3px;">
          Subscribe from $199/mo — keep everything running →
        </a>
        <p style="margin:12px 0 0;font-size:12px;color:#999;">
          Go to Settings → Billing inside your dashboard
        </p>
      </div>

      <hr style="border:none;border-top:1px solid #eeeeee;margin:0 0 24px;">

      <p style="font-size:13px;color:#666;line-height:1.7;margin:0 0 8px;">
        Questions? Just reply to this email — AK responds 24/7.<br>
        <strong style="color:#111;">Aaron — AKAI</strong><br>
        Founder, AKAI
      </p>
      <p style="font-size:12px;color:#999;margin:0;">
        <a href="https://getakai.ai" style="color:#999;text-decoration:none;">getakai.ai</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8f8f8;padding:16px 40px;text-align:center;border-top:1px solid #eeeeee;">
      <p style="margin:0;font-size:11px;color:#aaa;">
        AKAI · AI-Powered Business Automation · Sydney, Australia<br>
        You're receiving this because your 15-day free trial ends tomorrow.
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(`${RAILWAY_URL}/api/send-welcome`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': RAILWAY_API_KEY,
    },
    body: JSON.stringify({ to, subject, html }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Railway SMTP failed: ${await res.text()}`);
  }
}

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Trial system gate ────────────────────────────────────────────────────
  if (!TRIAL_MODE_ACTIVE) {
    console.info('[trial-day14] TRIAL_MODE_ACTIVE=false — skipping (no-op)');
    return NextResponse.json({ ok: true, skipped: true, reason: 'TRIAL_MODE_ACTIVE=false' });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Firestore unavailable' }, { status: 503 });
  }

  // Find users whose trialStartedAt was 14 days ago (within a 24h window)
  const day14Start = new Date(Date.now() - 15 * 86400000).toISOString(); // 15 days ago
  const day14End   = new Date(Date.now() - 14 * 86400000).toISOString(); // 14 days ago

  let usersSnap;
  try {
    usersSnap = await db
      .collection('users')
      .where('trialStartedAt', '>=', day14Start)
      .where('trialStartedAt', '<', day14End)
      .where('trialStatus', '==', 'active')
      .limit(50) // safety cap
      .get();
  } catch (err) {
    console.error('[trial-day14] Firestore query failed:', err);
    return NextResponse.json({ error: 'Firestore query failed' }, { status: 500 });
  }

  if (usersSnap.empty) {
    console.info('[trial-day14] No users at day 14 today');
    return NextResponse.json({ ok: true, sent: 0, message: 'No users at day 14 today' });
  }

  const results: Array<{ uid: string; email: string; result: string }> = [];
  let sent = 0;
  let errors = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const uid = userDoc.id;
    const email: string = data?.email ?? '';
    const name: string = data?.displayName ?? data?.name ?? '';
    const businessName: string =
      data?.onboarding?.businessName || data?.businessName || data?.campaignConfig?.businessName || '';

    if (!email) {
      results.push({ uid, email: '(none)', result: 'skipped — no email' });
      continue;
    }

    try {
      // Check a guard flag so we never send twice
      const alreadySent = data?.day14EmailSent === true;
      if (alreadySent) {
        results.push({ uid, email, result: 'skipped — already sent' });
        continue;
      }

      // Pull activity for personalisation
      const activity = await getUserActivity(uid);

      // Build + send email
      const subject = `Your AKAI trial ends tomorrow — here's what we built together`;
      const html = buildDay14Email({ name, email, businessName, activity });

      await sendEmail(email, subject, html);

      // Mark as sent so we never double-send
      await userDoc.ref.set({ day14EmailSent: true, day14EmailSentAt: new Date().toISOString() }, { merge: true });

      results.push({ uid, email, result: 'sent' });
      sent++;
      console.info(`[trial-day14] Sent to ${email}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'unknown error';
      results.push({ uid, email, result: `error: ${errMsg}` });
      errors++;
      console.error(`[trial-day14] Failed for ${email}:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    errors,
    results,
    timestamp: new Date().toISOString(),
  });
}
