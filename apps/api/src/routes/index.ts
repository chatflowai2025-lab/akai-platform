import { Router, Request, Response, type Router as ExpressRouter } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import chatRouter from './chat';
import teamsRouter from './teams';
import salesRouter from './modules/sales';
import recruitRouter from './modules/recruit';
import webRouter from './modules/web';
import calendarRouter from './calendar';
import analyticsRouter from './analytics';

const router: ExpressRouter = Router();

router.use('/health', healthRouter);
router.use('/healthz', healthRouter); // Railway health check alias
router.use('/auth', authRouter);
router.use('/chat', chatRouter);
router.use('/teams', teamsRouter);
router.use('/modules/sales', salesRouter);
router.use('/modules/recruit', recruitRouter);
router.use('/modules/web', webRouter);
router.use('/calendar', calendarRouter);
router.use('/analytics', analyticsRouter);

// OAuth capture — handles Google/Microsoft OAuth callbacks from onboarding + MM re-auth
router.get('/oauth-capture', async (req: Request, res: Response): Promise<void> => {
  const { code, error, state } = req.query as Record<string, string>;

  // Decode return URL from state param (onboarding OAuth flow passes this)
  let returnUrl: string | null = null;
  try {
    if (state) returnUrl = decodeURIComponent(state);
  } catch { /* ignore */ }

  if (error) {
    console.error('[oauth-capture] Error:', error);
    if (returnUrl) { res.redirect(`${returnUrl}&error=${encodeURIComponent(error)}`); return; }
    res.status(400).send(`<h2>Auth error: ${error}</h2>`);
    return;
  }
  if (!code) {
    res.status(400).send('<h2>No code received</h2>');
    return;
  }

  // Try to exchange Google code for tokens
  try {
    const clientId = process.env.GMAIL_OAUTH_CLIENT_ID || '';
    const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET || '';
    const redirectUri = 'https://api-server-production-2a27.up.railway.app/api/oauth-capture';
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
    });
    const tokens = await tokenRes.json() as any;
    if (!tokens.error) {
      console.log('[oauth-capture] Google token obtained, scopes:', tokens.scope);
    }
  } catch (e) {
    // Non-fatal — Microsoft tokens won't exchange here, that's fine
    console.log('[oauth-capture] Token exchange skipped (may be MS token)');
  }

  // If onboarding flow — redirect back to app
  if (returnUrl) {
    res.redirect(returnUrl);
    return;
  }

  res.send('<html><body style="font-family:sans-serif;text-align:center;padding:80px"><h2 style="color:#16a34a">✅ Connected!</h2><p>You can close this tab.</p></body></html>');
});

// Onboarding complete — fires welcome email + first leads list
// Public route — called from browser immediately after signup, no auth token yet
router.post('/onboarding/complete', async (req: Request, res: Response): Promise<void> => {
  // Accept internal API key OR no key (rate limited by IP via express-rate-limit)
  const key = req.headers['x-api-key'] as string;
  const validKey = process.env.API_KEY || 'aiclozr_api_key_2026_prod';
  const internalKey = process.env.INTERNAL_API_KEY || 'akai_internal_2026';
  if (key && key !== validKey && key !== internalKey) {
    res.status(401).json({ error: 'Invalid API key' }); return;
  }
  const { email, name, businessName, industry, location, website, contact, uid } = req.body;
  console.log(`[onboarding/complete] New signup: ${email} | ${businessName} | ${industry} | ${location}`);

  res.json({ ok: true, message: 'Onboarding complete — welcome email and leads queued' });

  // Fire and forget — send welcome email + leads asynchronously
  (async () => {
    try {
      const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
      const GMAIL_USER = process.env.GMAIL_USER || 'chatflowai2025@gmail.com';
      const GMAIL_REFRESH = process.env.GMAIL_OAUTH_REFRESH_TOKEN || '';
      const GMAIL_CLIENT_ID = process.env.GMAIL_OAUTH_CLIENT_ID || '';
      const GMAIL_CLIENT_SECRET = process.env.GMAIL_OAUTH_CLIENT_SECRET || '';
      const AARON_EMAIL = 'mrakersten@gmail.com';

      if (!email || !GMAIL_REFRESH) return;

      // Get Gmail token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ refresh_token: GMAIL_REFRESH, client_id: GMAIL_CLIENT_ID, client_secret: GMAIL_CLIENT_SECRET, grant_type: 'refresh_token' }).toString(),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) throw new Error('No Gmail token');

      // Generate 15 leads using Claude
      let leadsHtml = '';
      if (ANTHROPIC_KEY && industry && location) {
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 3000,
            messages: [{
              role: 'user',
              content: `Generate 15 realistic B2B sales leads for a ${industry} business in ${location}, Australia named "${businessName}". These are potential clients or referral partners.

For each lead return JSON: name, business, type, address, phone, email, website, confidence (✅✅ Verified/✅ Likely/⚠️ Unverified), outreach_email (2-3 sentences).

Return ONLY a valid JSON array, no other text.`
            }]
          }),
        });
        const claudeData = await claudeRes.json() as any;
        const text = claudeData.content?.[0]?.text || '[]';
        const start = text.indexOf('['); const end = text.lastIndexOf(']') + 1;
        const leads = JSON.parse(text.slice(start, end)) as any[];
        // Normalise leads
        leadsHtml = leads.slice(0, 15).map((l: any) => `
          <div style="background:#f9fafb;border-left:4px solid #D4AF37;padding:14px 16px;margin:0 0 10px;border-radius:0 8px 8px 0;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1a1a1a;">${l.name || ''} — ${l.business || ''}</p>
            <p style="margin:0 0 2px;font-size:12px;color:#6b7280;">📍 ${l.address || ''} | 📞 ${l.phone || ''} | ${l.confidence || '⚠️ Unverified'}</p>
            <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">✉️ ${l.email || ''} | 🌐 ${l.website || ''}</p>
            <p style="margin:6px 0 0;font-size:12px;color:#374151;font-style:italic;">"${(l.outreach_email || '').split("\n").join(" ")}"</p>
          </div>`).join('');
      }

      const websiteNote = website ? `<p style="color:#6b7280;font-size:13px;">We're running a full audit on <strong>${website}</strong> — results will appear in your dashboard.</p>` : '';

      const html = `<div style="font-family:-apple-system,sans-serif;max-width:640px;margin:0 auto;background:#f3f4f6;">
        <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;">
          <p style="margin:0;font-size:22px;font-weight:900;color:#fff;">AK<span style="color:#D4AF37;">AI</span></p>
          <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">Welcome to your AI business team</p>
        </div>
        <div style="background:#fff;padding:32px;">
          <h1 style="color:#1a1a1a;font-size:22px;font-weight:900;margin:0 0 12px;">Welcome, ${name || businessName || 'there'} 🚀</h1>
          <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">Your AKAI OS is live. Here's your first leads list — 15 prospects for <strong>${businessName}</strong> in <strong>${location}</strong>.</p>
          ${websiteNote}
          <div style="background:#fffbeb;border:2px solid #D4AF37;border-radius:10px;padding:16px 20px;margin:20px 0;">
            <p style="color:#1a1a1a;font-size:13px;font-weight:700;margin:0 0 4px;">Your 3-month free trial is active</p>
            <p style="color:#6b7280;font-size:12px;margin:0;">Log in to your dashboard to connect email, calendar, and start making calls.</p>
          </div>
          ${leadsHtml ? `<p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:20px 0 12px;">Your First 15 Leads</p>${leadsHtml}` : ''}
          <div style="text-align:center;margin:24px 0;">
            <a href="https://getakai.ai/dashboard" style="display:inline-block;background:#D4AF37;color:#000;font-weight:900;font-size:14px;padding:14px 36px;border-radius:10px;text-decoration:none;">Go to Your Dashboard →</a>
          </div>
        </div>
        <div style="background:#f9fafb;padding:14px 32px;border-radius:0 0 12px 12px;text-align:center;">
          <p style="color:#9ca3af;font-size:11px;margin:0;">AKAI · <a href="https://getakai.ai" style="color:#6b7280;text-decoration:none;">getakai.ai</a></p>
        </div>
      </div>`;

      const subjectText = `Welcome to AKAI — Your first ${industry} leads are ready`;
      const subject = `=?utf-8?b?${Buffer.from(subjectText).toString('base64')}?=`;
      const toLine = `${email}, ${AARON_EMAIL}`;
      const message = [`To: ${toLine}`, `From: "AKAI" <${GMAIL_USER}>`, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=utf-8', '', html].join('\r\n');
      const raw = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });
      console.log(`[onboarding/complete] Welcome email + leads sent to ${email}`);
    } catch (err: any) {
      console.error('[onboarding/complete] Error:', err.message);
    }
  })();
});

export default router;
