'use client';

import { useState } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import ChatPanel from '@/components/dashboard/ChatPanel';
import StatCard from '@/components/dashboard/StatCard';

export default function DashboardPage() {
  const [activeModule, setActiveModule] = useState<string>('sales');

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
            <h2 className="text-2xl font-bold mb-6 capitalize">{activeModule} Module</h2>
            <p className="text-gray-400">Module content coming soon...</p>
          </div>
          <ChatPanel />
        </div>
      </main>
    </div>
  );
}
