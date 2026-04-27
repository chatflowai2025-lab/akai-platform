'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'details' | 'auth'>('details');
  const [form, setForm] = useState({ name: '', businessName: '', industry: '', location: '' });

  useEffect(() => {
    const auth = getFirebaseAuth();
    const doSignout = async () => {
      if (auth?.currentUser) await signOut(auth).catch(() => {});
      setLoading(false);
    };
    doSignout();
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.businessName.trim()) return;
    // Save to sessionStorage so onboarding can pre-fill
    sessionStorage.setItem('akai_signup_details', JSON.stringify(form));
    setStep('auth');
  };

  const handleGoogle = async () => {
    setError(''); setAuthLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Auth not available');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) { await signInWithRedirect(auth, provider); return; }
      await signInWithPopup(auth, provider);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      if (!msg.includes('popup-closed') && !msg.includes('cancelled')) setError(msg);
      setAuthLoading(false);
    }
  };

  const handleMicrosoft = async () => {
    setError(''); setAuthLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Auth not available');
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({ prompt: 'select_account', tenant: process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID ?? 'common' });
      provider.addScope('email'); provider.addScope('profile');
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) { await signInWithRedirect(auth, provider); return; }
      await signInWithPopup(auth, provider);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      if (!msg.includes('popup-closed') && !msg.includes('cancelled')) setError(msg);
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-3xl font-black text-white tracking-tight">AK<span className="text-[#D4AF37]">AI</span></p>
          <p className="text-gray-400 text-sm mt-2">3-month free trial · No credit card</p>
        </div>

        <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-8">
          {step === 'details' ? (
            <>
              <h1 className="text-xl font-black text-white mb-1">Tell us about your business</h1>
              <p className="text-gray-500 text-sm mb-6">So your AI team knows who it's working for.</p>

              {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4"><p className="text-red-400 text-sm">{error}</p></div>}

              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Your name <span className="text-red-400">*</span></label>
                  <input
                    type="text" value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Sarah" required
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Business name <span className="text-red-400">*</span></label>
                  <input
                    type="text" value={form.businessName} onChange={e => set('businessName', e.target.value)}
                    placeholder="e.g. Sydney Plumbing Co" required
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Industry <span className="text-gray-600">(optional)</span></label>
                  <input
                    type="text" value={form.industry} onChange={e => set('industry', e.target.value)}
                    placeholder="e.g. Plumbing, Real estate, Fitness"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Location <span className="text-gray-600">(optional)</span></label>
                  <input
                    type="text" value={form.location} onChange={e => set('location', e.target.value)}
                    placeholder="e.g. Sydney, Melbourne"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!form.name.trim() || !form.businessName.trim()}
                  className="w-full bg-[#D4AF37] text-black font-black text-sm py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                >
                  Continue →
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">👋</span>
                </div>
                <h1 className="text-lg font-black text-white">Hi {form.name}!</h1>
                <p className="text-gray-400 text-sm mt-1">One last step — sign in to activate your account</p>
              </div>

              {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4"><p className="text-red-400 text-sm">{error}</p></div>}

              <button onClick={handleGoogle} disabled={authLoading}
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-sm px-4 py-3.5 rounded-xl hover:bg-gray-100 transition mb-3 disabled:opacity-50">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>

              <button onClick={handleMicrosoft} disabled={authLoading}
                className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] border border-[#3a3a3a] text-white font-semibold text-sm px-4 py-3.5 rounded-xl hover:border-[#D4AF37]/50 hover:bg-[#1f1f1f] transition mb-5 disabled:opacity-50">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/><path fill="#00A4EF" d="M1 13h10v10H1z"/><path fill="#FFB900" d="M13 13h10v10H13z"/></svg>
                Continue with Microsoft
              </button>

              <button onClick={() => setStep('details')} className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition">
                ← Back
              </button>
            </>
          )}

          {step === 'details' && (
            <p className="text-center text-xs text-gray-600 mt-5">
              Already have an account? <a href="/login" className="text-[#D4AF37] hover:underline">Sign in</a>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">
          By creating an account you agree to our <a href="/terms" className="text-gray-500 hover:text-gray-400">Terms of Service</a>
        </p>
      </div>
    </div>
  );
}
