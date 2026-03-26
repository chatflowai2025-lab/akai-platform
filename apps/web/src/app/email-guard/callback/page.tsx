'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const RAILWAY = 'https://api-server-production-2a27.up.railway.app';
const API_KEY = 'aiclozr_api_key_2026_prod';

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }

    const code = searchParams.get('code');
    if (!code) { router.replace('/email-guard?error=no_code'); return; }

    fetch(`${RAILWAY}/api/email/gmail/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({ code, userId: user.uid, redirectUri: 'https://getakai.ai/email-guard/callback' }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success || d.email) {
          router.replace('/email-guard?connected=gmail&email=' + encodeURIComponent(d.email || ''));
        } else {
          router.replace('/email-guard?error=' + encodeURIComponent(d.error || 'connection_failed'));
        }
      })
      .catch(() => router.replace('/email-guard?error=connection_failed'));
  }, [loading, user, searchParams, router]);

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
