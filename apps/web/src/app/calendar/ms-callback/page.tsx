'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const RAILWAY = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

function MSCalCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      router.replace('/calendar?error=' + encodeURIComponent(error));
      return;
    }

    if (!code) {
      router.replace('/calendar?error=no_code');
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) { router.replace('/login'); return; }

    const timeout = setTimeout(() => router.replace('/login'), 5000);

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      clearTimeout(timeout);
      unsub();
      if (attempted.current) return;
      attempted.current = true;

      try {
        // Exchange code for tokens
        const res = await fetch(`${RAILWAY}/api/email/microsoft/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
          body: JSON.stringify({
            code,
            state,
            userId: user.uid,
            redirectUri: 'https://getakai.ai/calendar/ms-callback',
          }),
        });
        const d = await res.json();

        if (d.success || d.email) {
          // Mark calendar as connected
          await fetch(`${RAILWAY}/api/email/microsoft/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
            body: JSON.stringify({ userId: user.uid, markCalendar: true }),
          }).catch(() => {});
          router.replace('/calendar?connected=outlook');
        } else {
          router.replace('/calendar?error=' + encodeURIComponent(d.error || 'ms_calendar_failed'));
        }
      } catch {
        router.replace('/calendar?error=ms_calendar_failed');
      }
    });

    return () => { clearTimeout(timeout); unsub(); };
  }, [searchParams, router]);

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      <p className="text-white/60 text-sm">Connecting Outlook Calendar…</p>
    </div>
  );
}

export default function MSCalCallbackPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MSCalCallbackInner />
    </Suspense>
  );
}
