'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import ChatPanel from '@/components/dashboard/ChatPanel';
import StatCard from '@/components/dashboard/StatCard';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<string>('sales');

  // Auth gate
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      <main className="flex-1 flex flex-col">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-[#1f1f1f]">
          <StatCard label="Calls Today" value="12" delta="+3" />
          <StatCard label="Meetings Booked" value="4" delta="+1" />
          <StatCard label="Pipeline Value" value="$48,000" delta="+$12k" />
          <StatCard label="Active Leads" value="87" delta="+23" />
        </div>

        {/* Main content + chat */}
        <div className="flex-1 flex">
          <div className="flex-1 p-6">
            {/* User info strip */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold capitalize">{activeModule} Module</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/30">{user.email}</span>
                <button
                  onClick={logout}
                  className="text-xs text-white/30 hover:text-white/60 transition"
                >
                  Sign out
                </button>
              </div>
            </div>
            <p className="text-gray-400">Module content coming soon...</p>
          </div>
          <ChatPanel />
        </div>
      </main>
    </div>
  );
}
