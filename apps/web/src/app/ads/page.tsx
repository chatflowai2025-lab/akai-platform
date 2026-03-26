'use client';

import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function AdsPage() {
  return (
    <DashboardLayout>
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">📣</div>
          <h1 className="text-2xl font-black text-white mb-2">Ads</h1>
          <p className="text-gray-500 text-sm">Coming soon — paid media strategy and creative generation.</p>
        </div>
      </main>
    </DashboardLayout>
  );
}
