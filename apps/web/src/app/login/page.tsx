'use client';


import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  getRedirectResult,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { BETA_MODE, BETA_CONTACT_EMAIL, isWhitelisted } from '@/lib/beta-config';

type Tab = 'signin' | 'signup';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams?.get('welcome') === 'true';
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('tab') === 'signup') return 'signup';
    }
    return 'signin';
  });
  const [email, setEmail] = useState(searchParams?.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // start false — show buttons immediately, set true only during active auth ops
  const [waitlistMode, setWaitlistMode] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistUid, setWaitlistUid] = useState('');
  const [waitlistWebsite, setWaitlistWebsite] = useState('');
  const [waitlistSent, setWaitlistSent] = useState(false);
  const [waitlistSending, setWaitlistSending] = useState(false);

  const cleanError = (msg: string) => {
    if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) return 'Invalid email or password.';
    if (msg.includes('email-already-in-use')) return 'An account with this email already exists.';
    if (msg.includes('weak-password')) return 'Password must be at least 6 characters.';
    if (msg.includes('invalid-email')) return 'Please enter a valid email address.';
    if (msg.includes('popup-closed')) return 'Sign-in cancelled.';
    if (msg.includes('account-exists-with-different-credential')) return 'This email is already linked to a different sign-in method. Try signing in with Google or Microsoft instead.';
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Auth not available');
      if (tab === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // Beta whitelist check
      if (BETA_MODE) {
        const currentUser = getFirebaseAuth()?.currentUser;
        const userEmail = currentUser?.email || email || '';
        if (!isWhitelisted(userEmail)) {
          await getFirebaseAuth()?.signOut();
          // Fire welcome + health report email for non-trailblazers
          setWaitlistEmail(userEmail);
          setWaitlistName(currentUser?.displayName || '');
          setWaitlistUid(currentUser?.uid || '');
          setWaitlistMode(true);
          setLoading(false);
          return;
        }
      }
      // Let onAuthStateChanged handle the redirect — it fires after Firebase
      // persists the session, avoiding a race where dashboard sees no user
    } catch (err: unknown) {
      setError(cleanError(err instanceof Error ? err.message : 'Something went wrong'));
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Auth not available');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user?.email || '';
      if (BETA_MODE && !isWhitelisted(userEmail)) {
        await auth.signOut();
        setWaitlistEmail(userEmail);
        setWaitlistName(result.user?.displayName || '');
        setWaitlistUid(result.user?.uid || '');
        setWaitlistMode(true);
        setLoading(false);
        return;
      }
      // onAuthStateChanged handles redirect
    } catch (err: unknown) {
      setError(cleanError(err instanceof Error ? err.message : 'Something went wrong'));
      setLoading(false);
    }
  };

  // If already signed in (e.g. after redirect), go straight to dashboard immediately.
  // Firestore profile check and onboarding routing happen on the dashboard — not here.
  useEffect(() => {
    let attempts = 0;
    const tryAuth = async () => {
      const auth = getFirebaseAuth();
      if (!auth) {
        if (attempts++ < 10) setTimeout(tryAuth, 300);
        return;
      }
      // Only set loading if coming from OAuth redirect (code= in URL)
      const hasOAuthCode = typeof window !== 'undefined' && window.location.search.includes('code=');

      const unsub = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // Already signed in — check whitelist, then redirect immediately (no Firestore wait)
          const userEmail = user.email || '';
          if (BETA_MODE && !isWhitelisted(userEmail)) {
            await auth.signOut();
            setLoading(false);
            return;
          }
          // Redirect immediately — onboarding check runs on the dashboard
          router.replace('/dashboard');
        } else if (hasOAuthCode) {
          // OAuth callback with no user yet — wait for it
          setLoading(true);
        } else {
          setLoading(false);
        }
      });
      return unsub;
    };
    tryAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle MS redirect result — retry until Firebase auth is ready
  useEffect(() => {
    let attempts = 0;
    const tryGetResult = () => {
      const auth = getFirebaseAuth();
      if (!auth) {
        // Firebase not ready yet — retry
        if (attempts++ < 10) setTimeout(tryGetResult, 300);
        return;
      }
      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user) {
            const userEmail = result.user.email || '';
            if (BETA_MODE && !isWhitelisted(userEmail)) {
              await auth.signOut();
              setWaitlistEmail(userEmail);
              setWaitlistName(result.user?.displayName || '');
              setWaitlistUid(result.user?.uid || '');
              setWaitlistMode(true);
              setLoading(false);
              return;
            }
            // onAuthStateChanged handles redirect — avoids race condition
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          // Ignore no-redirect-present errors (normal on fresh page loads)
          if (msg && !msg.includes('no-auth-event') && !msg.includes('No pending') && !msg.includes('no-redirect-error')) {
            console.error('[MS login] getRedirectResult error:', msg);
            setError(cleanError(msg));
            setLoading(false);
          }
        });
    };
    tryGetResult();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMicrosoft = async () => {
    setError('');
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Auth not available');
      const provider = new OAuthProvider('microsoft.com');
      const msTenant = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID ?? 'common';
      provider.setCustomParameters({ prompt: 'select_account', tenant: msTenant });
      provider.addScope('email');
      provider.addScope('profile');
      // Use popup — avoids redirect loop issues with Next.js app router
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user?.email || '';
      if (!userEmail) {
        await auth.signOut();
        setError('Could not retrieve email from Microsoft. Please try again.');
        setLoading(false);
        return;
      }
      // onAuthStateChanged handles redirect to dashboard
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microsoft sign-in failed.';
      if (!msg.includes('popup-closed') && !msg.includes('cancelled')) {
        setError(cleanError(msg));
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4 overflow-hidden">
      <Link href="/" className="flex items-center mb-8">
        <span className="text-xl font-black tracking-tight">AK<span className="text-[#D4AF37]">AI</span></span>
      </Link>

      {/* Waitlist / non-trailblazer capture */}
      {waitlistMode && (
        <div className="w-full max-w-md bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 sm:p-8">
          {!waitlistSent ? (
            <>
              <div className="text-center mb-6">
                <div className="text-3xl mb-3">🎉</div>
                <h2 className="text-xl font-black text-white mb-2">You&apos;re on the list!</h2>
                <p className="text-gray-400 text-sm">Aaron from AKAI will reach out personally. Add your website and we&apos;ll include a free digital health report in your email.</p>
              </div>
              <div className="space-y-3">
                <input
                  type="url"
                  placeholder="Your website URL (optional)"
                  value={waitlistWebsite}
                  onChange={e => setWaitlistWebsite(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
                />
                <button
                  onClick={async () => {
                    setWaitlistSending(true);
                    try {
                      await fetch('/api/welcome', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid: waitlistUid, email: waitlistEmail, name: waitlistName, website: waitlistWebsite }),
                      });
                    } catch { /* non-fatal */ }
                    setWaitlistSent(true);
                    setWaitlistSending(false);
                  }}
                  disabled={waitlistSending}
                  className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {waitlistSending ? 'Sending...' : 'Send my report →'}
                </button>
                <button onClick={() => setWaitlistMode(false)} className="w-full text-gray-500 text-sm hover:text-gray-300 transition py-2">← Back to sign in</button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-lg font-black text-white mb-2">Report on its way!</h2>
              <p className="text-gray-400 text-sm">Check your inbox at <strong className="text-white">{waitlistEmail}</strong> — your digital health report and next steps are on their way. Aaron will follow up personally.</p>
            </div>
          )}
        </div>
      )}

      {!waitlistMode && isWelcome && (
        <div className="w-full max-w-md mb-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl px-5 py-4 text-center">
          <p className="text-[#D4AF37] font-bold text-sm mb-1">Welcome to AKAI 👋</p>
          <p className="text-gray-400 text-xs">Sign in below to access your AI business team</p>
        </div>
      )}

      {!waitlistMode && <div className="w-full max-w-md bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 sm:p-8">
        <div className="flex mb-8 bg-[#0a0a0a] rounded-xl p-1">
          {(['signin', 'signup'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${tab === t ? 'bg-[#D4AF37] text-black' : 'text-white/40 hover:text-white/70'}`}>
              {t === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <h1 className="text-xl font-bold mb-1">{tab === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="text-white/40 text-sm mb-6">{tab === 'signin' ? 'Sign in to your AKAI workspace.' : 'Start your free trial today.'}</p>

        {/* Google */}
        <button type="button" onClick={handleGoogle} disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-[#1a1a1a] rounded-xl py-3 text-sm font-semibold hover:bg-gray-100 transition mb-3 disabled:opacity-50">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Microsoft */}
        <button type="button" onClick={handleMicrosoft} disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-[#0078d4] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#006cbd] transition mb-5 disabled:opacity-50">
          <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Continue with Microsoft
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[#1f1f1f]" />
          <span className="text-white/20 text-xs">or</span>
          <div className="flex-1 h-px bg-[#1f1f1f]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition text-sm" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-white/50 font-medium">Password</label>
              {tab === 'signin' && (
                <button type="button" className="text-xs text-[#D4AF37]/60 hover:text-[#D4AF37] transition" onClick={() => alert('Password reset coming soon.')}>Forgot password?</button>
              )}
            </div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'} required autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition text-sm" />
          </div>

          {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#D4AF37] hover:bg-[#F59E0B] text-black font-bold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 text-sm mt-2">
            {loading ? 'Please wait...' : tab === 'signin' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        <p className="text-center text-xs text-white/20 mt-6">
          {tab === 'signin' ? <>Don&apos;t have an account? <button onClick={() => { setTab('signup'); setError(''); }} className="text-[#D4AF37] hover:underline">Create one</button></> 
          : <>Already have an account? <button onClick={() => { setTab('signin'); setError(''); }} className="text-[#D4AF37] hover:underline">Sign in</button></>}
        </p>
      </div>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><span className="text-white/40 text-sm">Loading...</span></div>}>
      <LoginContent />
    </Suspense>
  );
}
