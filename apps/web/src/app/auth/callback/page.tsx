'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const msError = searchParams.get('error');

    if (msError) {
      const msgs: Record<string, string> = {
        not_whitelisted: 'AKAI is currently in private beta. Contact hello@getakai.ai to request access.',
        auth_cancelled: 'Sign-in was cancelled.',
        token_exchange_failed: 'Microsoft sign-in failed. Please try again.',
        no_email: 'Could not retrieve your email from Microsoft. Please try again.',
        server_error: 'Something went wrong. Please try again.',
      };
      setError(msgs[msError] || 'Sign-in failed. Please try again.');
      setStatus('error');
      return;
    }

    if (!token) {
      setError('Invalid sign-in link. Please try again.');
      setStatus('error');
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setTimeout(() => window.location.reload(), 500);
      return;
    }

    signInWithCustomToken(auth, token)
      .then(() => {
        router.replace('/dashboard');
      })
      .catch((err: Error) => {
        console.error('[auth/callback]', err);
        setError('Sign-in failed: ' + err.message);
        setStatus('error');
      });
  }, [searchParams, router]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <a href="/login" className="text-[#D4AF37] hover:underline text-sm">← Back to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div role="status" aria-label="Loading" className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Signing you in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div role="status" aria-label="Loading" className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
