'use client';

/**
 * TrialBanner — full-width bar shown at the top of the dashboard content area.
 *
 * States:
 *   active   (days 1-12): subtle gold bar  "Trial: X days remaining"
 *   ending   (days 13-15): amber warning   "Your trial ends in X days — subscribe…"
 *   expired  (day 15+):    red/gold bar    "Trial ended — Subscribe to reactivate"
 *   subscribed / !TRIAL_MODE_ACTIVE: renders nothing
 *
 * Trailblazers (whitelist) are always exempt — TrialBanner returns null for them.
 */

import type { TrialState } from '@/hooks/useTrialStatus';

interface TrialBannerProps {
  trial: TrialState;
}

export default function TrialBanner({ trial }: TrialBannerProps) {
  // Nothing to show while loading, or if subscribed, or active with many days left
  if (trial.loading) return null;
  if (trial.status === 'subscribed') return null;

  // Active trial with plenty of time — show subtle gold bar
  if (trial.status === 'active') {
    return (
      <div className="flex-shrink-0 bg-[#D4AF37]/10 border-b border-[#D4AF37]/20 px-6 py-2 flex items-center justify-between gap-3">
        <span className="text-[#D4AF37] text-xs font-semibold">
          ⏳ Free trial — {trial.daysLeft} day{trial.daysLeft !== 1 ? 's' : ''} remaining
        </span>
        <a
          href="/settings#upgrade"
          className="text-[10px] font-bold text-black bg-[#D4AF37] px-3 py-0.5 rounded-full hover:opacity-90 transition whitespace-nowrap"
        >
          Subscribe →
        </a>
      </div>
    );
  }

  // Ending (2 days left) — more prominent amber warning
  if (trial.status === 'ending') {
    return (
      <div className="flex-shrink-0 bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          <span className="text-amber-300 text-xs font-bold">
            Your trial ends in {trial.daysLeft} day{trial.daysLeft !== 1 ? 's' : ''} — subscribe to keep your AI team running
          </span>
        </div>
        <a
          href="/settings#upgrade"
          className="text-[10px] font-bold text-black bg-amber-400 px-3 py-1 rounded-full hover:opacity-90 transition whitespace-nowrap flex-shrink-0"
        >
          Subscribe now →
        </a>
      </div>
    );
  }

  // Expired — full-width red/gold lockout bar
  if (trial.status === 'expired') {
    return (
      <div className="flex-shrink-0 bg-[#1a0000] border-b border-red-500/40 px-6 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-red-400 text-sm font-black">⛔ Your trial has ended</p>
          <p className="text-red-400/70 text-xs mt-0.5">
            Subscribe to reactivate your AI team — your data is safe and your agents restart instantly.
          </p>
        </div>
        <a
          href="/settings#upgrade"
          className="text-sm font-black text-black bg-[#D4AF37] px-5 py-2 rounded-full hover:opacity-90 transition whitespace-nowrap flex-shrink-0"
        >
          Subscribe from $199/mo →
        </a>
      </div>
    );
  }

  return null;
}
