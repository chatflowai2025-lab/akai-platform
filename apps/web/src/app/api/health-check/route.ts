import { NextRequest, NextResponse } from 'next/server';

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8322387252:AAGIi7OYbwfIit4syQA95XWVZCTlPP96oQc';
const TG_CHAT = '8320254721';
const RAILWAY_API = process.env.NEXT_PUBLIC_API_URL || 'https://api-server-production-2a27.up.railway.app';
const RAILWAY_API_KEY = process.env.RAILWAY_API_KEY || 'aiclozr_api_key_2026_prod';

async function sendEmail(to: string, subject: string, html: string, resendKey: string) {
  // Primary: Railway SMTP relay (Gmail — proven deliverable)
  try {
    const res = await fetch(`${RAILWAY_API}/api/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
      body: JSON.stringify({ to, subject, html }),
    });
    if (res.ok) return;
    console.warn('[health-check] Railway SMTP failed:', await res.text());
  } catch (e) {
    console.warn('[health-check] Railway SMTP error:', e);
  }
  // Fallback: Resend
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'AKAI <onboarding@resend.dev>', to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
  return res.json();
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
  scores?: { overall?: number; seo?: number; cta?: number; mobile?: number; trust?: number };
  criticalGaps?: string[];
  quickWins?: Array<{ action: string; impact: string; akaiModule?: string }>;
  whatsWorking?: string[];
  opportunityScore?: number;
}

function buildUserEmail(name: string, website: string, businessType: string, recs: Recommendation[], auditData: AuditData | null): string {
  const displayName = name || 'there';
  const bType = businessType || 'your business';
  const overallScore = auditData?.scores?.overall;
  const headline = auditData?.headline || `Here's your digital health check for ${website}`;

  const scoreSection = overallScore != null ? `
    <div style="background:#111;border:1px solid #2a2a2a;border-radius:12px;padding:20px 24px;margin:24px 0;text-align:center;">
      <p style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Overall Website Score</p>
      <p style="color:${overallScore >= 7 ? '#22c55e' : overallScore >= 5 ? '#D4AF37' : '#ef4444'};font-size:48px;font-weight:900;margin:0;">${overallScore}<span style="font-size:24px;color:#555;">/10</span></p>
      <p style="color:#666;font-size:13px;margin:8px 0 0;">${headline}</p>
    </div>` : '';

  const recsHtml = recs.map((r, i) => `
    <div style="background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:18px 20px;margin:12px 0;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <span style="font-size:20px;flex-shrink:0;">${r.icon}</span>
        <div>
          <p style="color:#D4AF37;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 6px;">${i + 1}. ${r.category}</p>
          <p style="color:#999;font-size:13px;margin:0 0 8px;line-height:1.5;"><strong style="color:#fff;">Finding:</strong> ${r.finding}</p>
          <p style="color:#ccc;font-size:13px;margin:0 0 8px;line-height:1.5;"><strong style="color:#fff;">Fix:</strong> ${r.fix}</p>
          <p style="color:#888;font-size:12px;margin:0;line-height:1.4;">💡 <em>${r.impact}</em></p>
          ${r.akaiModule ? `<p style="margin:8px 0 0;"><span style="background:#D4AF37;color:#000;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;">⚡ AKAI: ${r.akaiModule}</span></p>` : ''}
        </div>
      </div>
    </div>`).join('');

  const workingSection = auditData?.whatsWorking?.length ? `
    <div style="background:#0a1a0a;border:1px solid #1a3a1a;border-radius:10px;padding:16px 20px;margin:24px 0;">
      <p style="color:#22c55e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 10px;">✅ What's Already Working</p>
      ${auditData.whatsWorking.map(w => `<p style="color:#aaa;font-size:13px;margin:4px 0;">• ${w}</p>`).join('')}
    </div>` : '';

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;background:#0a0a0a;color:#fff;padding:40px 32px;border-radius:16px;">
      <div style="margin-bottom:32px;">
        <p style="color:#D4AF37;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">AKAI Digital Health Check</p>
        <h1 style="color:#fff;font-size:26px;font-weight:900;margin:0 0 8px;line-height:1.2;">Hi ${displayName}, here's your report 👋</h1>
        <p style="color:#888;font-size:14px;margin:0;">We audited <strong style="color:#ccc;">${website}</strong> — a ${bType} — and generated personalised recommendations. Your report was ready in under 15 minutes.</p>
      </div>

      ${scoreSection}
      ${workingSection}

      <p style="color:#D4AF37;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;margin:24px 0 8px;">Your ${recs.length} Recommendations</p>

      ${recsHtml}

      <div style="background:#111;border:1px solid #D4AF37;border-radius:12px;padding:24px;margin:32px 0;text-align:center;">
        <p style="color:#D4AF37;font-size:14px;font-weight:700;margin:0 0 8px;">Ready to fix these?</p>
        <p style="color:#888;font-size:13px;margin:0 0 16px;">AKAI can automate most of these wins — chat, bookings, follow-up calls, and more.</p>
        <a href="https://getakai.ai" style="display:inline-block;background:#D4AF37;color:#000;font-weight:900;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">See AKAI in action →</a>
      </div>

      <hr style="border:none;border-top:1px solid #1f1f1f;margin:32px 0;" />
      <p style="color:#444;font-size:11px;text-align:center;margin:0;">AKAI · AI-Powered Business Automation · <a href="https://getakai.ai" style="color:#666;">getakai.ai</a></p>
    </div>`;
}

function buildAaronEmail(name: string, email: string, phone: string, website: string, businessType: string, auditList: string, auditData: AuditData | null): string {
  const score = auditData?.scores?.overall;
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#111;color:#fff;border-radius:8px;">
      <h2 style="color:#D4AF37;margin:0 0 16px;">🔥 New Health Check Lead</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tr><td style="padding:6px;color:#aaa;width:140px;">Name</td><td style="padding:6px;color:#fff;">${name || '—'}</td></tr>
        <tr><td style="padding:6px;color:#aaa;">Email</td><td style="padding:6px;"><a href="mailto:${email}" style="color:#D4AF37;">${email}</a></td></tr>
        <tr><td style="padding:6px;color:#aaa;">Website</td><td style="padding:6px;"><a href="${website}" style="color:#D4AF37;">${website}</a></td></tr>
        <tr><td style="padding:6px;color:#aaa;">Phone</td><td style="padding:6px;color:#fff;">${phone || '—'}</td></tr>
        <tr><td style="padding:6px;color:#aaa;">Business type</td><td style="padding:6px;color:#fff;">${businessType || '—'}</td></tr>
        <tr><td style="padding:6px;color:#aaa;">Audits</td><td style="padding:6px;color:#fff;">${auditList}</td></tr>
        ${score != null ? `<tr><td style="padding:6px;color:#aaa;">Score</td><td style="padding:6px;color:${score >= 7 ? '#22c55e' : score >= 5 ? '#D4AF37' : '#ef4444'};font-weight:bold;">${score}/10</td></tr>` : ''}
      </table>
      ${auditData?.criticalGaps?.length ? `<p style="color:#aaa;margin:16px 0 4px;font-size:12px;text-transform:uppercase;">Critical Gaps</p><ul style="color:#ef4444;font-size:13px;">${auditData.criticalGaps.map(g => `<li>${g}</li>`).join('')}</ul>` : ''}
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
        headers: { 'Content-Type': 'application/json', 'x-api-key': RAILWAY_API_KEY },
        body: JSON.stringify({ url: website, businessName: businessType || name || 'Business' }),
        signal: AbortSignal.timeout(12000),
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
          },
          criticalGaps: raw.criticalGaps ?? [],
          quickWins: raw.quickWins ?? [],
          whatsWorking: raw.whatsWorking ?? [],
          opportunityScore: raw.opportunityScore,
        };
      }
    } catch (err) {
      console.warn('[health-check] Audit fetch failed, continuing without it:', err);
    }

    // 2. Build vertical-aware recommendations
    const recs = getVerticalRecs(businessType || '', website, auditData);

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
