'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const RAILWAY = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;

    const code = searchParams.get('code');
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
    if (!auth) {
      router.replace('/login');
      return;
    }

    const timeout = setTimeout(() => {
      router.replace('/login');
    }, 5000);

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      clearTimeout(timeout);
      unsub();

      if (attempted.current) return;
      attempted.current = true;

      fetch(`${RAILWAY}/api/calendar/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({
          code,
          userId: user.uid,
          redirectUri: 'https://getakai.ai/calendar/callback',
        }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            router.replace('/calendar?connected=google');
          } else {
            router.replace('/calendar?error=' + encodeURIComponent(d.error || 'connection_failed'));
          }
        })
        .catch(() => router.replace('/calendar?error=connection_failed'));
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [searchParams, router]);

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
      <div role="status" aria-label="Loading" className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      <p className="text-white/60 text-sm">Connecting your Google Calendar…</p>
    </div>
  );
}

export default function CalendarCallbackPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center">
        <div role="status" aria-label="Loading" className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
