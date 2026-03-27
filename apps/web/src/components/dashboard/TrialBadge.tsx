'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { User } from 'firebase/auth';

const TRIAL_DAYS = 7;

interface TrialBadgeProps {
  user: User;
}

export default function TrialBadge({ user }: TrialBadgeProps) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    async function checkTrial() {
      try {
        const db = getFirebaseDb();
        if (!db) return;

        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) return;

        const data = snap.data();

        // If user is on a paid plan, don't show the badge
        if (data?.plan && data.plan !== 'trial') {
          setIsPaid(true);
          return;
        }

        // Get createdAt — could be Firestore Timestamp or ISO string
        const createdAt = data?.createdAt;
        if (!createdAt) return;

        let createdMs: number;
        if (typeof createdAt === 'object' && 'toDate' in createdAt) {
          createdMs = createdAt.toDate().getTime();
        } else if (typeof createdAt === 'string') {
          createdMs = new Date(createdAt).getTime();
        } else if (typeof createdAt === 'number') {
          createdMs = createdAt;
        } else {
          return;
        }

        const nowMs = Date.now();
        const elapsed = nowMs - createdMs;
        const trialMs = TRIAL_DAYS * 24 * 60 * 60 * 1000;
        const remaining = Math.ceil((trialMs - elapsed) / (24 * 60 * 60 * 1000));

        if (remaining <= 0) {
          setIsExpired(true);
          setDaysLeft(0);
        } else {
          setDaysLeft(remaining);
        }
      } catch {
        // Non-fatal — don't crash dashboard
      }
    }

    checkTrial();
  }, [user.uid]);

  // Don't show if paid or data not loaded
  if (isPaid || daysLeft === null) return null;

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10">
        <span className="text-xs text-red-400 font-semibold">⚠️ Trial expired</span>
        <a
          href="/settings#upgrade"
          className="text-xs bg-[#D4AF37] text-black font-bold px-2.5 py-0.5 rounded-full hover:opacity-90 transition whitespace-nowrap"
        >
          Upgrade →
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10">
      <span className="text-xs text-[#D4AF37] font-semibold whitespace-nowrap">
        🔥 7-day trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
      </span>
      <a
        href="/settings#upgrade"
        className="text-xs bg-[#D4AF37] text-black font-bold px-2.5 py-0.5 rounded-full hover:opacity-90 transition whitespace-nowrap"
      >
        Upgrade →
      </a>
    </div>
  );
}
