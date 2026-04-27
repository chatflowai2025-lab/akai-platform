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

export default router;
