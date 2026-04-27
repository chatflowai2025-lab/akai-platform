'use client';

/**
 * TrialBadge — small pill shown in the dashboard header.
 * Uses useTrialStatus, which respects TRIAL_MODE_ACTIVE and Trailblazer whitelist.
 * When TRIAL_MODE_ACTIVE=false or user is a Trailblazer → renders nothing.
 */

import { useTrialStatus } from '@/hooks/useTrialStatus';
import type { User } from 'firebase/auth';

interface TrialBadgeProps {
  user: User;
}

export default function TrialBadge({ user }: TrialBadgeProps) {
  const trial = useTrialStatus(user);

  // Don't render while loading, or subscribed, or no active trial system
  if (trial.loading) return null;
  if (trial.status === 'subscribed') return null;

  // Active — subtle gold pill
  if (trial.status === 'active') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10">
        <span className="text-xs text-[#D4AF37] font-semibold whitespace-nowrap">
          Free trial — {trial.daysLeft} days remaining
        </span>
      </div>
    );
  }

  // Ending
  if (trial.status === 'ending') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
        </span>
        <span className="text-xs text-amber-300 font-bold whitespace-nowrap">
          {trial.daysLeft}d left
        </span>

      </div>
    );
  }

  // Expired
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10">
      <span className="text-xs text-red-400 font-semibold">⚠️ Trial ended</span>

    </div>
  );
}
