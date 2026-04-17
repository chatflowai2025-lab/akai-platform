export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { TRIAL_MODE_ACTIVE, isWhitelisted } from '@/lib/beta-config';
import { TG_BOT_TOKEN, TG_AARON_CHAT_ID, RAILWAY_API_URL, RAILWAY_API_KEY } from '@/lib/server-env';

const TG_TOKEN = TG_BOT_TOKEN;
const TG_CHAT_ID = TG_AARON_CHAT_ID;
const RAILWAY_URL = RAILWAY_API_URL;

/* ── Telegram (non-blocking backup) ─────────────────────────────── */
async function notifyTelegram(text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch { /* non-fatal */ }
}

/* ── Gmail SMTP via Railway relay ────────────────────────────────── */
async function sendGmailNotification(params: {
  name: string;
  email: string;
  businessName: string;
  focus: string;
  source: string;
}) {
  const { name, email, businessName, focus, source } = params;
  const subject = `🔥 New AKAI lead — ${name || email} (${focus})`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px;">
      <h2 style="color:#D4AF37;margin:0 0 24px;">🔥 New Lead — Act Fast</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#888;padding:8px 0;width:160px;vertical-align:top;">Name</td><td style="color:#fff;">${name || '—'}</td></tr>
        <tr><td style="color:#888;padding:8px 0;vertical-align:top;">Email</td><td style="color:#fff;"><a href="mailto:${email}" style="color:#D4AF37;">${email}</a></td></tr>
        <tr><td style="color:#888;padding:8px 0;vertical-align:top;">Business</td><td style="color:#fff;">${businessName || '—'}</td></tr>
        <tr><td style="color:#888;padding:8px 0;vertical-align:top;">Wants to automate</td><td style="color:#D4AF37;font-weight:700;">${focus}</td></tr>
        <tr><td style="color:#888;padding:8px 0;vertical-align:top;">Source</td><td style="color:#fff;">${source}</td></tr>
      </table>
      <div style="margin-top:28px;">
        <a href="mailto:${email}" style="background:#D4AF37;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;">
          Reply to ${name || 'them'} →
        </a>
      </div>
    </div>`;

  try {
    const res = await fetch(`${RAILWAY_URL}/api/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
      body: JSON.stringify({ to: 'mrakersten@gmail.com', subject, html }),
    });
    if (res.ok) {
      console.info('[trial-interest] Notification email sent via Railway SMTP');
      return;
    }
    console.warn('[trial-interest] Railway SMTP notification failed:', await res.text());
  } catch (e) {
    console.warn('[trial-interest] Railway SMTP error:', e);
  }
}

/* ── Welcome email via /api/welcome ─────────────────────────────── */
async function fireWelcomeEmail(email: string, name: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://getakai.ai';
    await fetch(`${baseUrl}/api/welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: email, email, name }),
    });
    console.info(`[trial-interest] Welcome email triggered for ${email}`);
  } catch (e) {
    console.warn('[trial-interest] Welcome email trigger failed (non-fatal):', e);
  }
}

/* ── Main handler ────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name?: string;
      email?: string;
      businessName?: string;
      focus?: string;
      source?: string;
      plan?: string;
      // legacy fields — keep backward compat
      business?: string;
      phone?: string;
      industry?: string;
      website?: string;
    };

    const {
      name = '',
      email = '',
      businessName = body.business || '',
      focus = body.industry || '',
      source = 'hero_cta',
      plan,
      phone = '',
      website = '',
    } = body;

    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const tgMsg = `🔥 <b>New AKAI lead</b>${plan ? ` — <b>${plan}</b>` : ''}\n\n👤 ${name || 'Unknown'}\n📧 ${email}\n🏢 ${businessName || '—'}\n🎯 Automate: ${focus || '—'}\n📍 Source: ${source}`;

    // Persist to Firestore trialLeads
    const db = getAdminFirestore();
    // Determine if this person is a Trailblazer (whitelisted) or a waitlist signup
    const isTrailblazer = isWhitelisted(email);
    // When trial mode is active, non-whitelisted signups are waitlisted — no platform access yet
    const isWaitlisted = TRIAL_MODE_ACTIVE && !isTrailblazer;
    // When trial mode is OFF, ALL signups are waitlisted (closed beta, Trailblazers only)
    const isClosedBetaWaitlist = !TRIAL_MODE_ACTIVE && !isTrailblazer;
    const needsWaitlist = isWaitlisted || isClosedBetaWaitlist;

    const leadRecord = {
      name: name || '',
      email,
      businessName: businessName || '',
      focus: focus || '',
      source: source || 'hero_cta',
      plan: plan || null,
      // legacy fields for backward compat
      phone: phone || '',
      website: website || '',
      createdAt: new Date().toISOString(),
      // Waitlist flag — Aaron manually adds to whitelist when ready
      waitlisted: needsWaitlist,
      trialModeActiveAtSignup: TRIAL_MODE_ACTIVE,
      isTrailblazer,
    };

    const savePromise = db
      ? db.collection('trialLeads').add(leadRecord).catch(() => { /* non-fatal */ })
      : Promise.resolve();

    // Enrich Aaron's notification with waitlist context
    const enrichedTgMsg = needsWaitlist
      ? `${tgMsg}\n⏳ <b>WAITLISTED</b> — not added to platform yet. Add to whitelist in beta-config.ts when ready.`
      : tgMsg;

    if (needsWaitlist) {
      // Waitlisted signup — notify Aaron only, do NOT send platform welcome email
      await Promise.allSettled([
        savePromise,
        notifyTelegram(enrichedTgMsg),
        sendGmailNotification({ name, email, businessName, focus, source }),
        // No welcome email — waitlisted users don't have platform access yet
      ]);
      // Return a waitlisted response (frontend can show "you're on the list")
      return NextResponse.json({ ok: true, waitlisted: true });
    }

    // Trailblazer or open signup — fire the full welcome flow
    await Promise.allSettled([
      savePromise,
      notifyTelegram(enrichedTgMsg),
      sendGmailNotification({ name, email, businessName, focus, source }),
      fireWelcomeEmail(email, name),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
