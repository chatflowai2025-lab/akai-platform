# Railway API Migration Plan
## AKAI/artifacts/api-server → akai-platform/apps/api

**Status:** Planning phase — production stays on AKAI repo until migration complete  
**Date:** 2026-03-27  
**Risk level:** HIGH — production Railway service; migrate carefully

---

## Current State

| Location | Purpose |
|----------|---------|
| `AKAI/artifacts/api-server/` | **Production** — Railway API server (live at api-server-production-2a27.up.railway.app) |
| `akai-platform/apps/api/` | **Target** — Clean monorepo structure, partially built |

---

## Routes Already in akai-platform/apps/api

These routes exist and should be kept/enhanced:
- `auth.ts` — authentication
- `calendar.ts` — calendar integration
- `chat.ts` — AI chat
- `health.ts` — health check
- `teams.ts` — team management
- `routes/modules/sales` — sales module
- `routes/modules/recruit` — recruit module
- `routes/modules/web` — web module

---

## Routes Missing from akai-platform (29 routes)

### 🔴 Critical / Core Business Logic
These are actively used in production and power the AKAI product:

| Route | Description | Risk to Migrate |
|-------|-------------|-----------------|
| `emailPoller.ts` | Email Guard — poll Gmail/MS inbox, generate proposals | HIGH (has active users) |
| `gmailAuth.ts` | Gmail OAuth + token management | HIGH |
| `microsoftAuth.ts` | Microsoft OAuth + token management | HIGH |
| `msLogin.ts` | MS login flow | HIGH |
| `stripe.ts` | Payments | HIGH |
| `leads.ts` | Lead capture and management | HIGH |
| `mailGuard.ts` | Email Guard UI/rules API | MEDIUM |
| `signup.ts` | User registration | MEDIUM |
| `onboarding.ts` | User onboarding flow | MEDIUM |

### 🟡 Feature Routes
| Route | Description | Risk to Migrate |
|-------|-------------|-----------------|
| `campaign.ts` | Campaign management | MEDIUM |
| `outreach.ts` | Outreach sequences | MEDIUM |
| `notify.ts` | Push notifications | MEDIUM |
| `webhook.ts` | Inbound webhooks | MEDIUM |
| `recruiter.ts` | Recruiter module | MEDIUM |
| `analytics.ts` | Analytics/reporting | LOW |
| `feedback.ts` | User feedback | LOW |
| `referral.ts` | Referral program | LOW |
| `admin.ts` | Admin panel | LOW |

### 🟢 Low-Risk / Utility Routes
| Route | Description | Risk to Migrate |
|-------|-------------|-----------------|
| `health.ts` | Health check (duplicate — already in platform) | TRIVIAL |
| `anthropic/` | Anthropic AI helpers | LOW |
| `bland.ts` | Bland.ai voice calls | LOW |
| `telegram.ts` | Telegram bot integration | LOW |
| `webAudit.ts` | Website audit tool | LOW |
| `domainCheck.ts` | Domain availability checker | LOW |
| `googleAds.ts` | Google Ads integration | LOW |
| `searchConsole.ts` | Search Console integration | LOW |
| `dncr.ts` | Do Not Call Register check | LOW |
| `websiteMockup.ts` | Website mockup generator | LOW |
| `demo.ts` | Demo mode | LOW |
| `yachtDemo.ts` | Yacht demo (vertical) | LOW |
| `twilioApHeritage.ts` | Legacy Twilio / AP Heritage client | LOW |

---

## Migration Strategy

### Phase 0: Pre-migration (COMPLETE ✅)
- [x] Vercel aiclozr project disconnected from AKAI repo (no more failed builds on push)
- [x] microsoftAuth encrypt/decrypt exported (bug fix in place)

### Phase 1: Quick Wins (No breakage risk)
Move utility/standalone routes that have no shared state:

1. **`health.ts`** — trivial, update alias in index
2. **`telegram.ts`** — self-contained integration
3. **`webAudit.ts`** — standalone tool
4. **`domainCheck.ts`** — standalone tool
5. **`bland.ts`** — standalone AI voice
6. **`anthropic/`** — AI helper module
7. **`analytics.ts`** — read-only reporting
8. **`feedback.ts`** — simple CRUD
9. **`referral.ts`** — simple logic
10. **`demo.ts`** / **`yachtDemo.ts`** — demo content

**How:** Copy files → update `akai-platform/apps/api/src/routes/index.ts` → test locally → no Railway switch yet.

### Phase 2: Business Logic Routes
Migrate after Phase 1 validated:

1. `leads.ts` — test lead capture thoroughly
2. `campaign.ts` + `outreach.ts` — test together (linked)
3. `recruiter.ts` — standalone vertical
4. `notify.ts` + `webhook.ts` — test webhook delivery
5. `admin.ts` — internal tool, low external risk

### Phase 3: Auth + Payment (CRITICAL — needs ZeroDefect gate)
These require full E2E Playwright test coverage before moving:

1. `signup.ts` + `onboarding.ts` — user registration flow
2. `microsoftAuth.ts` + `msLogin.ts` — OAuth (ZeroDefect gate: must have E2E tests)
3. `gmailAuth.ts` — Gmail OAuth (ZeroDefect gate)
4. `stripe.ts` — Payments (ZeroDefect gate: test webhook + checkout + portal)
5. `mailGuard.ts` + `emailPoller.ts` — Email Guard (ZeroDefect gate)

### Phase 4: Railway Cutover
1. Deploy akai-platform/apps/api to Railway as **new service** (staging env)
2. Run full E2E tests against staging
3. Switch Railway custom domain to new service
4. Keep old AKAI service alive for 48h as fallback
5. Decommission old service

---

## Key Technical Differences to Resolve

### Encryption
- Old `microsoftAuth.ts`: `TOKEN_ENCRYPTION_KEY` env var (now exported ✅)
- Platform needs same env var — add to Railway environment

### Firebase Admin
- Old: `import { adminDb as db } from '../lib/firebase-admin'`
- Platform: verify same path exists at `akai-platform/apps/api/src/lib/firebase-admin`

### API Key Auth Middleware
- Old uses `x-api-key: aiclozr_api_key_2026_prod`
- Platform's `middlewares/` folder — verify same middleware pattern

### Environment Variables Required
Copy all from current Railway service:
- `TOKEN_ENCRYPTION_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GMAIL_CLIENT_ID` / `GOOGLE_GMAIL_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`
- `STRIPE_SECRET_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER`
- `BLAND_API_KEY`
- Firebase service account credentials

---

## Quick Win Recommendation

**Start with:** `webAudit.ts`, `domainCheck.ts`, `analytics.ts`, `telegram.ts`

These are completely self-contained, have no OAuth, no payments, no user auth. Can be copied and mounted in akai-platform in under 2 hours with zero production risk.

**Next sprint:** Phase 2 business logic routes — add them to akai-platform but keep Railway pointing at AKAI/artifacts/api-server until Phase 3 is verified.

**Never rush Phase 3** — Auth + Payments require the ZeroDefect gate (Playwright E2E tests must pass before any Railway cutover).
