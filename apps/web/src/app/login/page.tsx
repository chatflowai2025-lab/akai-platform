'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

type Tab = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.push('/onboard');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Something went wrong';
      // Clean up Firebase error messages
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid email or password.');
      } else if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists.');
      } else if (msg.includes('weak-password')) {
        setError('Password must be at least 6 characters.');
      } else if (msg.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <a href="/" className="flex items-center gap-2 mb-10">
        <div className="w-9 h-9 rounded-lg bg-[#D4AF37] flex items-center justify-center">
          <span className="text-black font-black text-sm">A</span>
        </div>
        <span className="text-2xl font-black tracking-tight">
          AK<span className="text-[#F59E0B]">AI</span>
        </span>
      </a>

      {/* Card */}
      <div className="w-full max-w-md bg-[#111] border border-[#1f1f1f] rounded-2xl p-8">
        {/* Tabs */}
        <div className="flex mb-8 bg-[#0a0a0a] rounded-xl p-1">
          <button
            onClick={() => { setTab('signin'); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              tab === 'signin'
                ? 'bg-[#D4AF37] text-black'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              tab === 'signup'
                ? 'bg-[#D4AF37] text-black'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold mb-1">
          {tab === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-white/40 text-sm mb-6">
          {tab === 'signin'
            ? 'Sign in to your AKAI workspace.'
            : 'Start your free trial today.'}
        </p>

        {/* Google (placeholder) */}
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl py-3 text-sm text-white/40 cursor-not-allowed mb-5"
          title="Coming soon"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" opacity="0.4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" opacity="0.4"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" opacity="0.4"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" opacity="0.4"/>
          </svg>
          Continue with Google — coming soon
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[#1f1f1f]" />
          <span className="text-white/20 text-xs">or</span>
          <div className="flex-1 h-px bg-[#1f1f1f]" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-white/50 font-medium">
                Password
              </label>
              {tab === 'signin' && (
                <button
                  type="button"
                  className="text-xs text-[#D4AF37]/60 hover:text-[#D4AF37] transition"
                  onClick={() => alert('Password reset coming soon.')}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'}
              required
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition text-sm"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4AF37] hover:bg-[#F59E0B] text-black font-bold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
          >
            {loading
              ? 'Please wait...'
              : tab === 'signin'
              ? 'Sign In →'
              : 'Create Account →'}
          </button>
        </form>

        {/* Footer text */}
        <p className="text-center text-xs text-white/20 mt-6">
          {tab === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => { setTab('signup'); setError(''); }}
                className="text-[#D4AF37] hover:underline"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setTab('signin'); setError(''); }}
                className="text-[#D4AF37] hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
