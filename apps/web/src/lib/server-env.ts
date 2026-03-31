/**
 * server-env.ts — Single source of truth for all server-side credentials.
 *
 * RULES (enforced by qa.sh Suite 5c):
 * - ALL secrets come from process.env — never hardcoded fallbacks with real values
 * - This file is the ONLY place env vars are read for credentials
 * - All routes import from here, never call process.env directly for secrets
 * - If an env var is missing, we return '' and let the caller handle it gracefully
 *
 * To add a new credential:
 * 1. Add it here with process.env.VAR_NAME ?? ''
 * 2. Set it in Vercel (and Railway if server-side)
 * 3. Never paste the real value into source code
 */

// ── Telegram ────────────────────────────────────────────────────────────────
export const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
export const TG_AARON_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';

// ── Resend ───────────────────────────────────────────────────────────────────
export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';

// ── X (Twitter) / @getakai_ai ────────────────────────────────────────────────
export const X_API_KEY       = process.env.X_API_KEY       ?? '';
export const X_API_SECRET    = process.env.X_API_SECRET    ?? '';
export const X_ACCESS_TOKEN  = process.env.X_ACCESS_TOKEN  ?? '';
export const X_ACCESS_SECRET = process.env.X_ACCESS_SECRET ?? '';

// ── Railway internal API ─────────────────────────────────────────────────────
export const RAILWAY_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api-server-production-2a27.up.railway.app';
export const RAILWAY_API_KEY = process.env.RAILWAY_API_KEY ?? process.env.NEXT_PUBLIC_RAILWAY_API_KEY ?? '';

// ── Anthropic ────────────────────────────────────────────────────────────────
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
