# AKAI — The AI Business Operating System

> Describe your business. We'll build it, run it, and grow it.

## Platform Modules

| Module | Status | Description |
|--------|--------|-------------|
| AKAI Sales | ✅ Active | AI finds leads, calls them, books meetings |
| AKAI Recruit | 🚧 Building | AI sources candidates, screens them, books interviews |
| AKAI Web | 🚧 Building | AI builds and runs your website via chat |
| AKAI Ads | 📋 Planned | Google + Meta ads managed by AI |
| AKAI Social | 📋 Planned | Instagram + LinkedIn content automation |

## Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **API:** Express.js, TypeScript
- **Auth:** Firebase Auth (Google OAuth + magic link)
- **DB:** Firebase Firestore
- **AI Calls:** Bland.ai (Sophie voice)
- **Payments:** Stripe
- **Deploy:** Vercel (web) + Railway (API)

## Quick Start
```bash
pnpm install
pnpm dev
```

## Architecture

```
akai-platform/
├── apps/
│   ├── web/      # Next.js 14 frontend (Vercel)
│   └── api/      # Express.js API server (Railway)
├── packages/
│   ├── shared-types/   # TypeScript types shared across apps
│   └── ui/             # Shared UI component library
└── infrastructure/     # Deploy configs
```

## Environment Variables

### apps/web/.env.local
```
NEXT_PUBLIC_API_URL=https://api.akai.ai
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

### apps/api/.env
```
PORT=3001
BLAND_API_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
STRIPE_SECRET_KEY=
OPENAI_API_KEY=
```

## Deploy

- **Web:** Push to `main` → auto-deploys to Vercel
- **API:** Push to `main` → auto-deploys to Railway

## Roadmap

- [x] AKAI Sales — Sophie AI calling engine
- [ ] AKAI Recruit — AI candidate sourcing + screening
- [ ] AKAI Web — Conversational site builder
- [ ] AKAI Ads — Google + Meta campaign management
- [ ] AKAI Social — Content automation pipeline
- [ ] AKAI Analytics — Cross-module insights dashboard
