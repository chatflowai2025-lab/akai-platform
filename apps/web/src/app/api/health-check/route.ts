export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Extend Vercel function timeout to 30s for audit

import { NextRequest, NextResponse } from 'next/server';

import { TG_BOT_TOKEN as TG_TOKEN, TG_AARON_CHAT_ID as TG_CHAT, RAILWAY_API_URL as RAILWAY_API, RAILWAY_API_KEY } from '@/lib/server-env';


async function getGmailToken(): Promise<string> {
  // Exchange refresh token for access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_OAUTH_CLIENT_ID || '',
      client_secret: process.env.GMAIL_OAUTH_CLIENT_SECRET || '',
      refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN || '',
      grant_type: 'refresh_token',
    }).toString(),
  });
  const data: { access_token?: string } = await res.json();
  if (!data.access_token) throw new Error('Failed to get Gmail token');
  return data.access_token;
}

async function sendEmail(to: string, subject: string, html: string, _resendKey: string) {
  // Primary: Gmail API via OAuth (proven working, no packages needed)
  try {
    const token = await getGmailToken();
    const from = 'chatflowai2025@gmail.com';
    // Build RFC 2822 message
    const message = [
      `To: ${to}`,
      `From: "AKAI" <${from}>`,
      `Subject: =?utf-8?b?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      html,
    ].join('\r\n');
    const raw = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) { console.info(`[health-check] Email sent via Gmail API to ${to}`); return; }
    const err = await res.text();
    console.warn('[health-check] Gmail API failed:', res.status, err);
  } catch (e: unknown) {
    console.warn('[health-check] Gmail API error:', e instanceof Error ? e.message : e);
  }
  // Fallback: Railway relay
  try {
    const res = await fetch(`${RAILWAY_API}/api/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RAILWAY_API_KEY}` },
      body: JSON.stringify({ to, subject, html }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) { console.info('[health-check] Email sent via Railway relay'); return; }
  } catch { /* ignore */ }
  throw new Error('All email methods failed');
}

// ── Vertical-aware recommendations ──────────────────────────────────────────

interface Recommendation {
  category: string;
  icon: string;
  finding: string;
  fix: string;
  impact: string;
  akaiModule?: string;
}

function getVerticalRecs(businessType: string, website: string, auditData: AuditData | null): Recommendation[] {
  const bt = (businessType || '').toLowerCase();
  const isTrades       = /trade|plumb|electri|build|constr|hvac|roof|paint|carpent/i.test(bt);
  const isHospitality  = /restaur|cafe|café|bar|venue|hospitality|food|drink/i.test(bt);
  const isRetail       = /retail|shop|store|ecommerce|product/i.test(bt);
  const isHealth       = /health|medical|clinic|gym|physio|dental|beauty|wellness|spa/i.test(bt);
  const isProfessional = /legal|law|account|consult|agency|finance|mortgage|insur/i.test(bt);
  const isRealestate   = /real estate|property|rental|letting/i.test(bt);

  // Base recs everyone gets (from audit gaps or universals)
  const base: Recommendation[] = [
    {
      category: 'Lead Capture',
      icon: '💬',
      finding: 'No live chat detected — you\'re losing enquiries that come in after hours.',
      fix: 'Add an AI chat widget that qualifies visitors and captures their details 24/7, even at midnight.',
      impact: 'Capture 30–40% more leads that currently bounce without contacting you.',
      akaiModule: 'Chat Widget',
    },
    {
      category: 'Bookings',
      icon: '📅',
      finding: 'No online booking visible — customers who can\'t book instantly go to someone who lets them.',
      fix: 'Add a one-click booking button that syncs with your Google or Outlook Calendar.',
      impact: 'Convert visitors to appointments 24/7 — no phone tag required.',
      akaiModule: 'Calendar',
    },
    {
      category: 'SEO / Meta Tags',
      icon: '🔍',
      finding: 'Basic SEO check — title and meta description may not be optimised for search intent.',
      fix: 'Update your page title to include your primary service and suburb. Write a meta description that answers the query your customer just typed.',
      impact: 'Click-through rate improvements of 15–30% are common with optimised snippets.',
    },
    {
      category: 'Google My Business',
      icon: '📍',
      finding: 'Local visibility depends heavily on your Google Business Profile being complete and active.',
      fix: 'Verify your Google Business Profile, add photos, update hours, and enable messaging.',
      impact: 'Appear in the \'near me\' map pack — often the highest-intent traffic for local businesses.',
    },
    {
      category: 'Page Speed',
      icon: '⚡',
      finding: 'Slow pages lose visitors — 53% of mobile users leave if a page takes over 3 seconds.',
      fix: 'Compress images, enable lazy loading, and use a CDN. Most quick wins take under an hour to implement.',
      impact: 'Every 1-second improvement increases conversions by ~7% on average.',
    },
    {
      category: 'Calls to Action',
      icon: '🎯',
      finding: 'CTAs that blend in get ignored. Visitors need a clear, high-contrast next step.',
      fix: 'Place a single primary CTA above the fold. Make it a button, not a link. Use action words: "Book a free quote", "Call now", "Get started".',
      impact: 'Well-placed CTAs can double or triple your contact rate from the same traffic.',
    },
    {
      category: 'Social Proof',
      icon: '⭐',
      finding: 'Buyers check reviews before calling. If they can\'t find proof of your work, they hesitate.',
      fix: 'Add 3–5 customer testimonials (with first name + suburb). Embed your Google review score. Add before/after photos if applicable.',
      impact: '92% of consumers read online reviews — businesses with visible social proof convert at 2–3× the rate.',
    },
    {
      category: 'Mobile Experience',
      icon: '📱',
      finding: 'Over 60% of website visits are on mobile. Any friction on mobile = lost customers.',
      fix: 'Ensure your phone number is a tap-to-call link. Check that forms are thumb-friendly. Verify your site loads cleanly on a real iPhone and Android.',
      impact: 'Fixing mobile UX often results in the single biggest conversion jump, especially for local businesses.',
    },
  ];

  // Vertical-specific overrides / additions
  if (isTrades) {
    base.unshift({
      category: 'Emergency Response',
      icon: '🚨',
      finding: 'Trade businesses miss jobs when they don\'t answer fast enough — especially emergencies.',
      fix: 'Add a 24/7 AI phone assistant that captures job details and sends them to you instantly, even at 2am.',
      impact: 'Tradespeople who respond to emergency enquiries within 5 minutes close them at 80%+ vs 30% for next-day callbacks.',
      akaiModule: 'Chat Widget',
    });
    base.push({
      category: 'Quote Follow-Up',
      icon: '📋',
      finding: 'Most tradies send a quote then hope — 70% of quotes that go cold never had a follow-up call.',
      fix: 'Automate a follow-up call or SMS 48 hours after each quote using Sophie AI.',
      impact: 'Automated follow-up can recover 20–30% of cold quotes.',
      akaiModule: 'Sales (Sophie AI)',
    });
  }

  if (isHospitality) {
    base.unshift({
      category: 'Online Reservations',
      icon: '🍽️',
      finding: 'Restaurants and venues without online booking lose reservations to platforms that have it.',
      fix: 'Add a direct reservation form or link (not just a phone number). Connect it to your POS or calendar.',
      impact: '60% of diners prefer booking online — every form barrier loses reservations to OpenTable or your competitors.',
      akaiModule: 'Calendar',
    });
    base.push({
      category: 'Social Content',
      icon: '📸',
      finding: 'Hospitality is visual. Regular social content is a free acquisition channel most venues underuse.',
      fix: 'Post 3–5 times per week on Instagram and Facebook with food photos, specials, and behind-the-scenes content.',
      impact: 'Consistent posting builds local following — 1,000 engaged followers can fill a dining room.',
      akaiModule: 'Social',
    });
  }

  if (isRetail || isHealth) {
    base.push({
      category: 'Abandoned Visitors',
      icon: '🔄',
      finding: 'Most visitors leave without buying or booking. Without a re-engagement tool, they\'re gone forever.',
      fix: 'Add an exit-intent capture (offer, discount, or "ask a question" prompt) to capture email or phone before they leave.',
      impact: 'Exit-intent tools typically recover 5–15% of abandoning visitors.',
      akaiModule: 'Chat Widget',
    });
  }

  if (isProfessional || isRealestate) {
    base.unshift({
      category: 'Lead Response Speed',
      icon: '⏱️',
      finding: 'Professional services leads expect a response within minutes — not hours.',
      fix: 'Deploy Sophie AI to call every new enquiry within 60 seconds, qualify them, and book a consultation directly.',
      impact: 'Responding within 5 minutes is 21× more effective than responding within 30 minutes.',
      akaiModule: 'Sales (Sophie AI)',
    });
    base.push({
      category: 'Trust Signals',
      icon: '🏆',
      finding: 'Professional services need authority signals — logos, accreditations, and case studies.',
      fix: 'Add your professional accreditations, industry body memberships, and 2–3 anonymised case studies or results.',
      impact: 'Authority signals reduce perceived risk — the #1 reason prospects don\'t convert in professional services.',
    });
  }

  // Inject actual audit gaps if we have them
  if (auditData?.criticalGaps) {
    const gapRec: Recommendation = {
      category: 'Critical Gaps Found',
      icon: '🔴',
      finding: auditData.criticalGaps[0] ?? 'Critical issues detected on your website.',
      fix: auditData.quickWins?.[0]?.action ?? 'Review and fix critical gaps identified in the audit.',
      impact: auditData.quickWins?.[0]?.impact ?? 'Significant conversion improvement expected.',
      akaiModule: auditData.quickWins?.[0]?.akaiModule,
    };
    base.splice(1, 0, gapRec);
  }

  return base.slice(0, 8);
}

// ── Email templates ──────────────────────────────────────────────────────────

interface AuditData {
  headline?: string;
  scores?: { overall?: number; seo?: number; cta?: number; mobile?: number; trust?: number; speed?: number };
  criticalGaps?: string[];
  quickWins?: Array<{ action: string; impact: string; akaiModule?: string }>;
  whatsWorking?: string[];
  opportunityScore?: number;
}

function buildUserEmail(name: string, website: string, businessType: string, recs: Recommendation[], auditData: AuditData | null): string {
  const displayName = name || 'there';
  const bType = businessType || 'your business';
  const scores = auditData?.scores;
  const overallScore = scores?.overall;
  const headline = auditData?.headline || `Here's your digital health check for ${website}`;

  // Score badge colours
  const scoreColor = overallScore != null
    ? (overallScore >= 7 ? '#16a34a' : overallScore >= 5 ? '#b45309' : '#dc2626')
    : '#b45309';
  const scoreBg = overallScore != null
    ? (overallScore >= 7 ? '#f0fdf4' : overallScore >= 5 ? '#fffbeb' : '#fef2f2')
    : '#fffbeb';
  const scoreBorder = overallScore != null
    ? (overallScore >= 7 ? '#86efac' : overallScore >= 5 ? '#fcd34d' : '#fca5a5')
    : '#fcd34d';
  const scoreLabel = overallScore != null
    ? (overallScore >= 7 ? '✅ Strong' : overallScore >= 5 ? '⚠️ Needs Work' : '🔴 Critical Issues')
    : '';

  // Overall score section
  const scoreSection = overallScore != null ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" style="background:${scoreBg};border:2px solid ${scoreBorder};border-radius:12px;padding:24px 40px;text-align:center;">
            <tr><td style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;">Overall Website Score</td></tr>
            <tr><td style="color:${scoreColor};font-size:52px;font-weight:900;line-height:1;">${overallScore}<span style="font-size:24px;color:#9ca3af;">/10</span></td></tr>
            <tr><td style="padding-top:10px;"><span style="background:${scoreColor};color:#ffffff;font-size:11px;font-weight:700;padding:4px 14px;border-radius:999px;">${scoreLabel}</span></td></tr>
            <tr><td style="color:#6b7280;font-size:13px;padding-top:12px;max-width:360px;line-height:1.4;">${headline}</td></tr>
          </table>
        </td>
      </tr>
    </table>` : '';

  // Score breakdown bars (table-based for Outlook compat)
  const scoreBreakdown = (() => {
    if (!scores) return '';
    const metrics: Array<{ label: string; value: number | undefined }> = [
      { label: 'SEO',    value: scores.seo    },
      { label: 'Mobile', value: scores.mobile  },
      { label: 'CTA',    value: scores.cta    },
      { label: 'Trust',  value: scores.trust  },
      { label: 'Speed',  value: scores.speed  },
    ].filter(m => m.value != null);
    if (!metrics.length) return '';

    const rows = metrics.map(m => {
      const pct = Math.round((m.value! / 10) * 100);
      const barColor = pct >= 70 ? '#16a34a' : pct >= 50 ? '#D4AF37' : '#dc2626';
      const emptyPct = 100 - pct;
      return `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#374151;font-size:12px;font-weight:700;white-space:nowrap;width:56px;">${m.label}</td>
          <td style="padding:6px 8px 6px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="${pct}%" style="background:${barColor};height:8px;border-radius:4px 0 0 4px;"></td>
                ${emptyPct > 0 ? `<td width="${emptyPct}%" style="background:#e5e7eb;height:8px;border-radius:0 4px 4px 0;"></td>` : ''}
              </tr>
            </table>
          </td>
          <td style="padding:6px 0;color:${barColor};font-size:12px;font-weight:900;white-space:nowrap;width:36px;">${pct}%</td>
        </tr>`;
    }).join('');

    return `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
        <p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 14px;">Score Breakdown</p>
        <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </div>`;
  })();

  // What's Working (green tinted)
  const workingSection = auditData?.whatsWorking?.length ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:0 0 16px;">
      <p style="color:#16a34a;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;">✅ What's Already Working</p>
      ${auditData.whatsWorking.map(w => `<p style="color:#374151;font-size:13px;margin:4px 0;line-height:1.5;">• ${w}</p>`).join('')}
    </div>` : '';

  // Critical Gaps (red tinted)
  const gapsSection = auditData?.criticalGaps?.length ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
      <p style="color:#dc2626;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;">🔴 Critical Gaps</p>
      ${auditData.criticalGaps.map(g => `<p style="color:#374151;font-size:13px;margin:4px 0;line-height:1.5;">• ${g}</p>`).join('')}
    </div>` : '';

  // Quick Wins (gold left-border cards)
  const quickWinsSection = auditData?.quickWins?.length ? `
    <p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;">⚡ Quick Wins</p>
    ${auditData.quickWins.map((w, i) => `
      <div style="background:#fffbeb;border-left:4px solid #D4AF37;border-radius:0 8px 8px 0;padding:12px 16px;margin:0 0 8px;">
        <p style="color:#1a1a1a;font-size:13px;font-weight:700;margin:0 0 3px;">${i + 1}. ${w.action}</p>
        <p style="color:#6b7280;font-size:12px;margin:0;">💡 ${w.impact}</p>
      </div>`).join('')}
    <div style="height:16px;"></div>` : '';

  // Recommendations
  const recsHtml = recs.map((r, i) => `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid #D4AF37;border-radius:0 8px 8px 0;padding:16px 18px;margin:0 0 10px;">
      <p style="color:#b45309;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 6px;">${r.icon} ${i + 1}. ${r.category}</p>
      <p style="color:#374151;font-size:13px;margin:0 0 6px;line-height:1.5;"><strong style="color:#1a1a1a;">Finding:</strong> ${r.finding}</p>
      <p style="color:#374151;font-size:13px;margin:0 0 6px;line-height:1.5;"><strong style="color:#1a1a1a;">Fix:</strong> ${r.fix}</p>
      <p style="color:#6b7280;font-size:12px;margin:0;line-height:1.4;">💡 <em>${r.impact}</em></p>
      ${r.akaiModule ? `<p style="margin:8px 0 0;"><span style="background:#D4AF37;color:#000;font-size:10px;font-weight:700;padding:3px 10px;border-radius:999px;">⚡ AKAI: ${r.akaiModule}</span></p>` : ''}
    </div>`).join('');

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;background:#f3f4f6;">

      <!-- Header -->
      <div style="background:#1a1a1a;padding:20px 32px;border-radius:12px 12px 0 0;">
        <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">AK<span style="color:#D4AF37;">AI</span></p>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">Digital Health Check Report</p>
      </div>

      <!-- Body -->
      <div style="background:#ffffff;padding:32px;">
        <h1 style="color:#1a1a1a;font-size:24px;font-weight:900;margin:0 0 8px;line-height:1.2;">Here's your free digital health report 👋</h1>
        <p style="color:#6b7280;font-size:14px;margin:0 0 2px;"><strong style="color:#1a1a1a;">${website}</strong></p>

        ${scoreSection}
        ${scoreBreakdown}
        ${workingSection}
        ${gapsSection}
        <p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 12px;">Your ${recs.length} Recommendations</p>

        ${recsHtml}

        <!-- CTA -->
        <div style="background:#fffbeb;border:2px solid #D4AF37;border-radius:12px;padding:24px;margin:28px 0;text-align:center;">
          <p style="color:#1a1a1a;font-size:15px;font-weight:700;margin:0 0 6px;">Ready to fix these?</p>
          <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">AKAI can automate most of these wins — chat, bookings, follow-up calls, and more.</p>
          <a href="https://getakai.ai/signup" style="display:inline-block;background:#D4AF37;color:#000000;font-weight:900;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;">Start Free Trial — Fix It Now →</a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;border-radius:0 0 12px 12px;text-align:center;">
        <p style="color:#9ca3af;font-size:11px;margin:0;">AKAI · AI-Powered Business Automation · <a href="https://getakai.ai" style="color:#6b7280;text-decoration:none;">getakai.ai</a></p>
      </div>

    </div>`;
}

function buildAaronEmail(name: string, email: string, phone: string, website: string, businessType: string, auditList: string, auditData: AuditData | null): string {
  const score = auditData?.scores?.overall;
  const scoreColor = score != null ? (score >= 7 ? '#16a34a' : score >= 5 ? '#b45309' : '#dc2626') : '#374151';
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f3f4f6;">
      <div style="background:#1a1a1a;padding:16px 24px;border-radius:12px 12px 0 0;">
        <p style="margin:0;font-size:18px;font-weight:900;color:#ffffff;">AK<span style="color:#D4AF37;">AI</span></p>
        <p style="margin:2px 0 0;color:#9ca3af;font-size:11px;">New Health Check Lead</p>
      </div>
      <div style="background:#ffffff;padding:24px;">
        <h2 style="color:#1a1a1a;font-size:20px;font-weight:900;margin:0 0 16px;">🔥 New Health Check Lead</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;width:140px;">Name</td><td style="padding:8px 0;color:#1a1a1a;font-size:13px;font-weight:600;">${name || '—'}</td></tr>
          <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#D4AF37;font-size:13px;text-decoration:none;font-weight:600;">${email}</a></td></tr>
          <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;">Website</td><td style="padding:8px 0;"><a href="${website}" style="color:#D4AF37;font-size:13px;text-decoration:none;">${website}</a></td></tr>
          <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;">Phone</td><td style="padding:8px 0;color:#1a1a1a;font-size:13px;">${phone || '—'}</td></tr>
          <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;">Business type</td><td style="padding:8px 0;color:#1a1a1a;font-size:13px;">${businessType || '—'}</td></tr>
          <tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;">Audits</td><td style="padding:8px 0;color:#1a1a1a;font-size:13px;">${auditList}</td></tr>
          ${score != null ? `<tr><td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;">Score</td><td style="padding:8px 0;color:${scoreColor};font-size:14px;font-weight:900;">${score}/10</td></tr>` : ''}
        </table>
        ${auditData?.criticalGaps?.length ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-top:16px;">
          <p style="color:#dc2626;font-size:11px;font-weight:700;text-transform:uppercase;margin:0 0 8px;">Critical Gaps</p>
          ${auditData.criticalGaps.map(g => `<p style="color:#374151;font-size:13px;margin:3px 0;">• ${g}</p>`).join('')}
        </div>` : ''}
      </div>
      <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:12px 24px;border-radius:0 0 12px 12px;text-align:center;">
        <p style="color:#9ca3af;font-size:11px;margin:0;">AKAI · <a href="https://getakai.ai" style="color:#6b7280;text-decoration:none;">getakai.ai</a></p>
      </div>
    </div>`;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, businessType, audits } = body;
    const rawWebsite = body.website || '';
    const website = rawWebsite && !/^https?:\/\//i.test(rawWebsite)
      ? `https://${rawWebsite.replace(/^www\./i, 'www.')}`
      : rawWebsite;

    if (!email || !website) {
      return NextResponse.json({ error: 'Email and website are required' }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const auditList = Array.isArray(audits) && audits.length > 0 ? audits.join(', ') : 'General audit';

    // 1. Run the real website audit from Railway (non-blocking — don't fail if unavailable)
    let auditData: AuditData | null = null;
    try {
      const auditRes = await fetch(`${RAILWAY_API}/api/website-mockup/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RAILWAY_API_KEY}` },
        body: JSON.stringify({ url: website, businessName: businessType || name || 'Business' }),
        signal: AbortSignal.timeout(25000),
      });
      if (auditRes.ok) {
        const raw = await auditRes.json();
        auditData = {
          headline: raw.headline,
          scores: {
            overall: raw.scores?.overall,
            seo: raw.scores?.seo,
            cta: raw.scores?.cta,
            mobile: raw.scores?.mobile,
            trust: raw.scores?.trust,
            speed: raw.scores?.speed,
          },
          criticalGaps: raw.criticalGaps ?? [],
          quickWins: raw.quickWins ?? [],
          whatsWorking: raw.whatsWorking ?? [],
          opportunityScore: raw.opportunityScore,
        };
        console.info('[health-check] auditData received:', JSON.stringify({ headline: auditData.headline, scores: auditData.scores, criticalGapsCount: auditData.criticalGaps?.length, quickWinsCount: auditData.quickWins?.length, whatsWorkingCount: auditData.whatsWorking?.length }));
      }
    } catch (err) {
      console.warn('[health-check] Audit fetch failed, continuing without it:', err);
    }

    // 2. Build recommendations — prefer actual audit quick wins over generic vertical recs
    let recs = getVerticalRecs(businessType || '', website, auditData);
    // If we have real audit data with quick wins, use those as the primary recommendations
    if (auditData?.quickWins && auditData.quickWins.length > 0) {
      const auditRecs = auditData.quickWins.slice(0, 5).map(w => ({
        category: w.akaiModule || 'Quick Win',
        icon: '⚡',
        finding: w.action,
        fix: `Implement this to improve your ${w.impact.toLowerCase()} impact.`,
        impact: `${w.impact} impact — recommended by AKAI AI audit`,
        akaiModule: w.akaiModule,
      }));
      // Merge: audit recs first, then fill with vertical recs not already covered
      recs = [...auditRecs, ...recs.slice(0, 3)].slice(0, 8);
    }

    // 3. Notify Telegram (always — even if email fails)
    try {
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TG_CHAT,
          text: `🩺 *New Health Check Lead!*\n\n👤 ${name || 'Unknown'}\n📧 ${email}\n📞 ${phone || 'n/a'}\n🌐 ${website}\n🏢 ${businessType || 'n/a'}\n✅ Audits: ${auditList}${auditData?.scores?.overall != null ? `\n📊 Score: ${auditData.scores.overall}/10` : ''}`,
          parse_mode: 'Markdown',
        }),
      });
    } catch { /* non-fatal */ }

    if (!resendKey) {
      console.warn(`[health-check] Mock mode — lead from ${email} (${name}), site: ${website}`);
      return NextResponse.json({ success: true, message: 'Health check booked (mock)' });
    }

    // 4. Send personalised report to user + notification to Aaron
    const userHtml = buildUserEmail(name, website, businessType || '', recs, auditData);
    const aaronHtml = buildAaronEmail(name, email, phone, website, businessType, auditList, auditData);

    const emailResults = await Promise.allSettled([
      sendEmail(email, `✅ Your Free Digital Health Check — ${website}`, userHtml, resendKey),
      sendEmail('mrakersten@gmail.com', `🔥 New Health Check Lead: ${name || email}`, aaronHtml, resendKey),
    ]);

    const emailErrors = emailResults
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason?.message ?? 'unknown');

    if (emailErrors.length > 0) {
      console.warn('[health-check] Email send errors (non-fatal):', emailErrors);
    }

    return NextResponse.json({
      success: true,
      ...(emailErrors.length > 0 ? { emailWarning: 'Report generated; email delivery may be delayed.' } : {}),
    });
  } catch (err) {
    console.error('[health-check] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
