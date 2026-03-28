# AKAI Retro — Telegram Per-Client Notification System

## Date
2026-03-28

## RCA: Client Notification Was Aaron-Only

**What happened:**
The Telegram bot was hardcoded to Aaron's personal chat ID (`8320254721`). This meant clients had no way to receive proactive AKAI updates — lead alerts, meeting bookings, or daily briefings — via Telegram. Every notification went to Aaron regardless of which client's account triggered it.

**Root cause:**
The notification system was built for internal ops use (Aaron monitoring the system) and was never designed for client-facing delivery. There was no per-client identity layer — no mechanism to associate a Telegram chat_id with a Firestore user UID.

**Impact:**
- Clients received zero proactive Telegram notifications
- Aaron received all notifications, including those irrelevant to him
- Client engagement loop was broken: clients couldn't "feel" AKAI working for them

## What Was Built

### Per-client Telegram routing architecture:
1. Client visits `/settings` → sees "Connect Telegram" section
2. They click the deep link: `https://t.me/mmwinningbot?start={uid}`
3. Telegram opens → bot receives `/start {uid}`
4. Bot saves `chat_id` → `Firestore users/{uid}.telegramChatId`
5. AKAI calls `POST /api/telegram/notify/{uid}` → message routes to that client's Telegram

### Files created/modified:
- `AKAI/artifacts/api-server/src/routes/telegramClient.ts` — Railway API: client-webhook, notify/:uid, status/:uid
- `AKAI/artifacts/api-server/src/routes/telegram.ts` — Added `/start {uid}` handler to existing webhook
- `akai-platform/apps/web/src/app/settings/page.tsx` — New Telegram connect card with deep link + test button
- `akai-platform/apps/web/src/app/api/telegram/test/route.ts` — Next.js test endpoint
- `email-poller/poller.js` — Aaron notified for all Trailblazer emails (per-client routing pending Railway deploy)

## Prevention Gate (Permanent)

**Rule:** Any new notification call MUST check for `users/{uid}.telegramChatId` in Firestore before routing.

**Implementation:**
- `POST /api/telegram/notify/:uid` — always looks up Firestore first, returns `{error: 'not connected'}` if no chat_id
- Never hardcode a chat ID in application code; always resolve from Firestore
- New notification feature checklist:
  - [ ] Does it look up `telegramChatId` from Firestore?
  - [ ] Does it fall back gracefully if not connected (no error thrown, just skips)?
  - [ ] Is the Railway `notify/:uid` endpoint called rather than the Telegram API directly?
  - [ ] Has a test been written that verifies per-client routing?

**Webhook registration note:**
Telegram bots support only ONE active webhook URL. The existing webhook at `/api/telegram/webhook` handles all bot messages including `/start {uid}`. Do NOT register a separate webhook for `/api/telegram/client-webhook` — it is unused and can be removed in a future cleanup.

## What Aaron Needs to Do

The Telegram webhook URL is auto-registered on Railway startup (see `src/index.ts`). After deploying, verify it's registered correctly:

```
GET https://api.telegram.org/bot{TOKEN}/getWebhookInfo
```

Should return: `"url": "https://api-server-production-2a27.up.railway.app/api/telegram/webhook"`

If not, trigger a Railway redeploy — the startup hook will re-register it.
