import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { google } from 'googleapis';
import { getFirebaseAdmin } from '../lib/firebase';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const router: ExpressRouter = Router();

// ── Middleware: simple API key check ─────────────────────────────────────────
function requireApiKey(req: Request, res: Response, next: () => void): void {
  const key = req.headers['x-api-key'];
  if (key !== (process.env.API_KEY || 'aiclozr_api_key_2026_prod')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// ── OAuth2 client factory ─────────────────────────────────────────────────────
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars must be set');
  }
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://api-server-production-2a27.up.railway.app/api/calendar/google/callback',
  );
}

// ── GET /api/calendar/google/auth-url?userId=xxx ──────────────────────────────
router.get('/google/auth-url', requireApiKey, (req: Request, res: Response): void => {
  const { userId } = req.query as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const oauth2 = getOAuth2Client();
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state: Buffer.from(userId).toString('base64'),
  });

  res.json({ url });
});

// ── GET /api/calendar/google/callback?code=xxx&state=userId ──────────────────
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

  if (error) {
    res.redirect('https://getakai.ai/calendar?error=google_denied');
    return;
  }

  if (!code || !state) {
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  let userId: string;
  try {
    userId = Buffer.from(state, 'base64').toString('utf8');
  } catch {
    res.status(400).json({ error: 'Invalid state param' });
    return;
  }

  try {
    const oauth2 = getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);

    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    await db.doc(`users/${userId}/integrations/googleCalendar`).set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type,
      expiryDate: tokens.expiry_date,
      connected: true,
      connectedAt: FieldValue.serverTimestamp(),
    });

    res.redirect('https://getakai.ai/calendar?connected=google');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[Calendar] callback error:', msg);
    res.redirect('https://getakai.ai/calendar?error=google_failed');
  }
});

// ── GET /api/calendar/google/events?userId=xxx ───────────────────────────────
router.get('/google/events', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.query as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const snap = await db.doc(`users/${userId}/integrations/googleCalendar`).get();

    if (!snap.exists || !snap.data()?.connected) {
      res.status(404).json({ error: 'Google Calendar not connected' });
      return;
    }

    const data = snap.data()!;
    const oauth2 = getOAuth2Client();
    oauth2.setCredentials({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      token_type: data.tokenType,
      expiry_date: data.expiryDate,
    });

    // Auto-refresh if expired
    oauth2.on('tokens', async (tokens) => {
      const update: Record<string, unknown> = {};
      if (tokens.access_token) update.accessToken = tokens.access_token;
      if (tokens.expiry_date) update.expiryDate = tokens.expiry_date;
      if (Object.keys(update).length) {
        await db.doc(`users/${userId}/integrations/googleCalendar`).update(update);
      }
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2 });
    const result = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 30,
      singleEvents: true,
      orderBy: 'startTime',
    });

    res.json({ events: result.data.items || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[Calendar] events error:', msg);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ── DELETE /api/calendar/google/disconnect?userId=xxx ───────────────────────
router.delete('/google/disconnect', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.query as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    await db.doc(`users/${userId}/integrations/googleCalendar`).delete();
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[Calendar] disconnect error:', msg);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

export default router;
