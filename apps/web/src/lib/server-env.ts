/**
 * server-env.ts — Single source of truth for all server-side credentials.
 *
 * RULES (enforced by qa.sh Suite 5c):
 * - ALL secrets come from process.env — no hardcoded values, no fallbacks with real values
 * - This file is the ONLY place env vars are read for credentials
 * - All routes import from here, never call process.env directly for secrets
 * - Missing required vars throw at import time — fail loud, not silent
 *
 * To add a new credential:
 * 1. Add it here with require('VAR_NAME')
 * 2. Set it in Vercel + Railway
 * 3. Never paste the real value into source code
 */

// NEXT_PHASE is set by Next.js during build — use it to avoid throwing at build time
const IS_BUILD = process.env.NEXT_PHASE === 'phase-production-build';

function require(name: string): string {
  const val = process.env[name];
  if (!val) {
    const msg = `[server-env] Missing required env var: ${name}`;
    // Never throw during build — Next.js needs to collect routes without env vars
    if (!IS_BUILD && process.env.NODE_ENV === 'production') throw new Error(msg);
    if (process.env.NODE_ENV !== 'test') console.warn(msg);
    return '';
  }
  return val;
}

// ── Telegram ─────────────────────────────────────────────────────────────────
export const TG_BOT_TOKEN     = require('TELEGRAM_BOT_TOKEN');
export const TG_AARON_CHAT_ID = require('TELEGRAM_CHAT_ID');

// ── Resend ────────────────────────────────────────────────────────────────────
export const RESEND_API_KEY = require('RESEND_API_KEY');

// ── X (Twitter) / @getakai_ai ─────────────────────────────────────────────────
export const X_API_KEY       = require('X_API_KEY');
export const X_API_SECRET    = require('X_API_SECRET');
export const X_ACCESS_TOKEN  = require('X_ACCESS_TOKEN');
export const X_ACCESS_SECRET = require('X_ACCESS_SECRET');

// ── Railway internal API ──────────────────────────────────────────────────────
export const RAILWAY_API_URL = require('NEXT_PUBLIC_API_URL');
export const RAILWAY_API_KEY = require('RAILWAY_API_KEY');

// ── Anthropic ─────────────────────────────────────────────────────────────────
export const ANTHROPIC_API_KEY = require('ANTHROPIC_API_KEY');
