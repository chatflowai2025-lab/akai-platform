'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

export default function SocialPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
        <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
          <div>
            <h1 className="text-xl font-black text-white">Social</h1>
            <p className="text-xs text-gray-500 mt-0.5">AI-powered social media content and scheduling</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium">Planned</span>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-6">📱</div>
            <h2 className="text-2xl font-black text-white mb-3">Social is coming soon</h2>
            <p className="text-gray-500 text-sm leading-relaxed">AI-generated posts, captions, and scheduling across Instagram, LinkedIn, and more.</p>
          </div>
        </div>
    </DashboardLayout>
  );
}
