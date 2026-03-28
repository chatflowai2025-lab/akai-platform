'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function WelcomePage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    // Redirect to login with welcome param
    router.replace(`/login?welcome=true&client=${params.clientId}`);
  }, [router, params.clientId]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <p className="text-3xl font-black text-white mb-2">AK<span className="text-[#D4AF37]">AI</span></p>
        <p className="text-gray-500 text-sm">Loading your workspace...</p>
        <div role="status" aria-label="Loading" className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mt-4" />
      </div>
    </div>
  );
}
