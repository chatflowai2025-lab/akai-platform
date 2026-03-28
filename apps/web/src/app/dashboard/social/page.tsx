'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

/**
 * /dashboard/social — redirects to the full Social module at /social.
 */
export default function SocialDashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (!loading && user) {
      router.replace('/social');
    }
  }, [user, loading, router]);

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
