'use client';

import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⚙️</div>
          <h1 className="text-2xl font-black text-white mb-2">Settings</h1>
          <p className="text-gray-500 text-sm">Coming soon — account and workspace configuration.</p>
        </div>
      </main>
    </DashboardLayout>
  );
}
