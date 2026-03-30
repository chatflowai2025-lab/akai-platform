// AKAI Beta Access Control
// safeMode = full platform experience, no live calls or external emails sent

export const BETA_MODE = true;
export const BETA_CONTACT_EMAIL = process.env.NEXT_PUBLIC_BETA_CONTACT_EMAIL ?? 'hello@getakai.ai';

// ── Trial system ──────────────────────────────────────────────────────────────
// TRIAL_MODE_ACTIVE = false → trial system is built but completely dormant.
//   • No trial banners, no countdown, no windback for anyone.
//   • Day 14 email cron is a no-op.
//   • Trailblazers (whitelist below) always have unlimited access regardless.
//
// When Aaron is ready to open signups, flip this to true and redeploy.
// From that point, all NEW non-whitelisted signups get a 15-day trial.
export const TRIAL_MODE_ACTIVE = false;
export const TRIAL_DAYS = 15;

/**
 * Compute the trial state for a user given their trialStartedAt ISO timestamp.
 * If trialStartedAt is null/undefined, returns 'active' (grace period for new users).
 */
export function getTrialState(trialStartedAt: string | null | undefined): 'active' | 'ending' | 'expired' {
  if (!trialStartedAt) return 'active'; // new user, grace period
  const days = Math.floor((Date.now() - new Date(trialStartedAt).getTime()) / 86400000);
  if (days >= TRIAL_DAYS) return 'expired';
  if (days >= TRIAL_DAYS - 2) return 'ending'; // days 13-14 → "ending"
  return 'active';
}

/**
 * Days remaining in the trial, given a trialStartedAt ISO timestamp.
 * Returns TRIAL_DAYS if no start date (full trial available).
 * Never goes below 0.
 */
export function getTrialDaysLeft(trialStartedAt: string | null | undefined): number {
  if (!trialStartedAt) return TRIAL_DAYS;
  const elapsed = Math.floor((Date.now() - new Date(trialStartedAt).getTime()) / 86400000);
  return Math.max(0, TRIAL_DAYS - elapsed);
}

/**
 * Returns true if this email should be subject to the trial system.
 * Whitelisted Trailblazers are always exempt — they have unlimited access.
 */
export function isTrialUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return !isWhitelisted(email);
}

export const BETA_WHITELIST: Record<string, { name: string; safeMode: boolean }> = {
  'mrakersten@gmail.com': { name: 'Aaron', safeMode: true },
  'pagliariccimarco@gmail.com': { name: 'Marco', safeMode: false },
  'info@apheritageinterior.com.au': { name: 'AP Heritage', safeMode: false },
  'danielle.avissar@gmail.com': { name: 'Danielle', safeMode: false },
  'henrik.mortensen@live.com.au': { name: 'Henrik', safeMode: true },
  'kemalarafeh@gmail.com': { name: 'Kemal', safeMode: true },
  'im.dan.vallejos@gmail.com': { name: 'Dan', safeMode: true },
  'shawnsellar@gmail.com': { name: 'Shawn', safeMode: true },
  'jilljjqb@gmail.com': { name: 'Jill', safeMode: true },
  'chatflowai2025@gmail.com': { name: 'Aaron', safeMode: false },
  'getakainow@outlook.com': { name: 'Aaron', safeMode: false },
  'getakaiai@outlook.com': { name: 'Aaron', safeMode: false },
};

export function isWhitelisted(email: string): boolean {
  return email.toLowerCase() in BETA_WHITELIST;
}

export function isSafeMode(email: string): boolean {
  const entry = BETA_WHITELIST[email.toLowerCase() as keyof typeof BETA_WHITELIST];
  return entry?.safeMode ?? false;
}
