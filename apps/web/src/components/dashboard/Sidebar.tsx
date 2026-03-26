'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

const MODULES = [
  { id: 'sales', icon: '📞', label: 'Sales', status: 'live', href: '/sales', external: false },
  { id: 'voice', icon: '🎙️', label: 'Voice', status: 'live', href: '/voice', external: false },

  { id: 'recruit', icon: '🎯', label: 'Recruit', status: 'live', href: '/recruit', external: false },
  { id: 'web', icon: '🌐', label: 'Web', status: 'live', href: '/web', external: false },
  { id: 'email-guard', icon: '✉️', label: 'Email', status: 'live', href: '/email-guard', external: false },
  { id: 'calendar', icon: '📅', label: 'Calendar', status: 'live', href: '/calendar', external: false },
  { id: 'ads', icon: '📣', label: 'Ads', status: 'live', href: '/ads', external: false },
  { id: 'social', icon: '📱', label: 'Social', status: 'live', href: '/social', external: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, external: boolean) => {
    if (external) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1f1f1f]">
        <Link href="/dashboard" className="flex items-center justify-between">
          <span className="text-xl font-black tracking-tight">AK<span className="text-[#F59E0B]">AI</span></span>
          <button
            className="md:hidden text-gray-400 hover:text-white p-1"
            onClick={() => setMobileOpen(false)}
          >✕</button>
        </Link>
      </div>

      {/* Dashboard link */}
      <div className="px-3 pt-3">
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
            pathname === '/dashboard'
              ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
              : 'text-gray-400 hover:text-white hover:bg-[#111]'
          )}
        >
          <span>🏠</span>
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Modules Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-xs text-gray-600 uppercase tracking-wider px-3 mb-3">Modules</p>
        {MODULES.map(mod => {
          const active = isActive(mod.href, mod.external);
          const linkProps = mod.external
            ? { href: mod.href, target: '_blank', rel: 'noopener noreferrer' }
            : { href: mod.href };

          if (mod.status === 'planned') {
            return (
              <div
                key={mod.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 opacity-50 cursor-not-allowed"
              >
                <span>{mod.icon}</span>
                <span>{mod.label}</span>
                <span className="ml-auto text-xs text-gray-700">Soon</span>
              </div>
            );
          }

          return (
            <Link
              key={mod.id}
              {...linkProps}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                  : 'text-gray-400 hover:text-white hover:bg-[#111]'
              )}
            >
              <span>{mod.icon}</span>
              <span>{mod.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom — Settings + Sign Out */}
      <div className="px-3 py-4 border-t border-[#1f1f1f] space-y-1">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
              : 'text-gray-400 hover:text-white hover:bg-[#111]'
          )}
        >
          <span>⚙️</span>
          <span>Settings</span>
        </Link>

        {/* User + Sign Out */}
        <div className="pt-2 mt-1 border-t border-[#1a1a1a]">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-gray-600 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <span>↩</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-[#080808] border-r border-[#1f1f1f] flex-col h-full overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-[#080808] border-r border-[#1f1f1f] flex flex-col overflow-y-auto">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Mobile bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080808] border-t border-[#1f1f1f] flex items-center justify-around px-2 py-2">
        <Link href="/dashboard" className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs', pathname === '/dashboard' ? 'text-[#D4AF37]' : 'text-gray-500')}>
          <span className="text-lg">🏠</span>
          <span>Home</span>
        </Link>
        <Link href="/voice" className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs', pathname.startsWith('/voice') ? 'text-[#D4AF37]' : 'text-gray-500')}>
          <span className="text-lg">🎙️</span>
          <span>Voice</span>
        </Link>
        <Link href="/sales" className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs', pathname.startsWith('/sales') ? 'text-[#D4AF37]' : 'text-gray-500')}>
          <span className="text-lg">📞</span>
          <span>Sales</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs text-gray-500">
          <span className="text-lg">☰</span>
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
}


