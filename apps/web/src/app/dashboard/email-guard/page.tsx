'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

/**
 * /dashboard/email-guard — redirects to the full Email Guard module at /email-guard.
 * The Email Guard module lives at the top-level route with its own DashboardLayout.
 */
export default function EmailGuardDashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (!loading && user) {
      router.replace('/email-guard');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <div
            role="status"
            aria-label="Loading"
            className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex items-center justify-center">
        <div
          role="status"
          aria-label="Redirecting"
          className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"
        />
      </div>
    </DashboardLayout>
  );
}
