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
    if (!code) {
      router.replace('/email-guard?error=no_code');
      return;
    }

    // Wait for Firebase auth to resolve (up to 5s)
    const auth = getFirebaseAuth();
    if (!auth) {
      router.replace('/login');
      return;
    }

    const timeout = setTimeout(() => {
      // Auth timed out — redirect to login
      router.replace('/login');
    }, 5000);

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return; // Keep waiting
      
      clearTimeout(timeout);
      unsub();

      if (attempted.current) return;
      attempted.current = true;

      fetch(`${RAILWAY}/api/email/gmail/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ 
          code, 
          userId: user.uid, 
          redirectUri: 'https://getakai.ai/email-guard/callback' 
        }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.success || d.email) {
            router.replace('/email-guard?connected=gmail&email=' + encodeURIComponent(d.email || 'connected'));
          } else {
            router.replace('/email-guard?error=' + encodeURIComponent(d.error || 'connection_failed'));
          }
        })
        .catch(() => router.replace('/email-guard?error=connection_failed'));
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [searchParams, router]);

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      <p className="text-white/60 text-sm">Connecting your Gmail…</p>
    </div>
  );
}

export default function GmailCallbackPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
