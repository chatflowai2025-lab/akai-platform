'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';


// ── Module groups ─────────────────────────────────────────────────────────────
const MODULE_GROUPS = [
  {
    label: 'Core',
    modules: [
      { id: 'sales',      icon: '📞', label: 'Sales',     href: '/sales',       shortcut: '⌘1' },
      { id: 'voice',      icon: '🎙️', label: 'Voice',     href: '/voice',       shortcut: '⌘2' },
      { id: 'email-guard',icon: '✉️', label: 'Email',     href: '/email-guard', shortcut: '⌘3' },
      { id: 'calendar',   icon: '📅', label: 'Calendar',  href: '/calendar',    shortcut: '⌘4' },
    ],
  },
  {
    label: 'Growth',
    modules: [
      { id: 'ads',      icon: '📣', label: 'Ads',      href: '/ads',      shortcut: '⌘5' },
      { id: 'social',   icon: '📱', label: 'Social',   href: '/social',   shortcut: '⌘6' },
      { id: 'recruit',  icon: '🎯', label: 'Recruit',  href: '/recruit',  shortcut: '⌘7' },
      { id: 'web',      icon: '🌐', label: 'Web',      href: '/web',      shortcut: '⌘8' },
      { id: 'proposals',icon: '📄', label: 'Proposals',href: '/proposals',shortcut: '⌘9' },
    ],
  },
  {
    label: 'Intelligence',
    modules: [
      { id: 'health',      icon: '🩺', label: 'Health',      href: '/health',             shortcut: '⌘H' },
      { id: 'code-shield', icon: '🛡️', label: 'Code Shield', href: '/dashboard/code-shield', shortcut: '⌘K' },
    ],
  },
];

// ── Live dot pulse ────────────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarColor, setAvatarColor] = useState('#D4AF37');
  const [avatarPhotoUrl, setAvatarPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirebaseDb();
    if (!db) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.avatarColor) setAvatarColor(d.avatarColor);
      if (d.avatarPhotoUrl !== undefined) setAvatarPhotoUrl(d.avatarPhotoUrl || null);
    });
    return unsub;
  }, [user?.uid]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/dashboard" className="flex items-center justify-between">
          <span className="text-xl font-black tracking-tight">
            AK<span className="text-[#D4AF37]">AI</span>
          </span>
          <button
            className="md:hidden text-gray-400 hover:text-white p-1"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >✕</button>
        </Link>
      </div>

      {/* Dashboard home link */}
      <div className="px-3 pt-3">
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            pathname === '/dashboard'
              ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-l-[3px] border-l-[#D4AF37] pl-[calc(0.75rem-3px)]'
              : 'text-gray-400 hover:text-white hover:bg-[#111] border-l-[3px] border-l-transparent pl-[calc(0.75rem-3px)]'
          )}
        >
          <span>🏠</span>
          <span className="flex-1">Dashboard</span>
        </Link>
      </div>

      {/* Module groups */}
      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto">
        {MODULE_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.modules.map(mod => {
                const active = isActive(mod.href);
                return (
                  <Link
                    key={mod.id}
                    href={mod.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative',
                      active
                        ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-l-[3px] border-l-[#D4AF37] pl-[calc(0.75rem-3px)]'
                        : 'text-gray-400 hover:text-white hover:bg-[#111] border-l-[3px] border-l-transparent pl-[calc(0.75rem-3px)]'
                    )}
                  >
                    <span className="text-base leading-none">{mod.icon}</span>
                    <span className="flex-1">{mod.label}</span>
                    {/* LIVE dot */}
                    <LiveDot />
                    {/* Keyboard shortcut hint — visible on hover */}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-gray-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#2a2a2a] flex-shrink-0">
                      {mod.shortcut}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom — Settings + Sign Out */}
      <div className="px-3 py-4 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Theme toggle row */}
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400">
          <span>🎨</span>
          <span className="flex-1">Theme</span>
          
        </div>

        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-l-[3px] pl-[calc(0.75rem-3px)]',
            pathname === '/settings'
              ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-l-[#D4AF37]'
              : 'text-gray-400 hover:text-white hover:bg-[#111] border-l-transparent'
          )}
        >
          <span>⚙️</span>
          <span>Settings</span>
        </Link>

        {/* User + Sign Out */}
        <div className="pt-2 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="px-3 py-2 mb-1 flex items-center gap-2">
            {avatarPhotoUrl ? (
              <Image
                src={avatarPhotoUrl}
                alt="Avatar"
                width={28}
                height={28}
                className="rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-black"
                style={{ backgroundColor: avatarColor }}
              >
                {(user?.email || 'A')[0]?.toUpperCase() ?? 'A'}
              </div>
            )}
            <p className="text-xs text-gray-600 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-colors border-l-[3px] border-l-transparent pl-[calc(0.75rem-3px)]"
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
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col h-full overflow-y-auto" style={{ backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 h-full flex flex-col overflow-y-auto" style={{ backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Mobile bottom nav bar — 4 most-used modules */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2" style={{ backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <Link
          href="/dashboard"
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs',
            pathname === '/dashboard' ? 'text-[#D4AF37]' : 'text-gray-500'
          )}
        >
          <span className="text-lg">🏠</span>
          <span>Home</span>
        </Link>
        <Link
          href="/email-guard"
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs',
            pathname.startsWith('/email-guard') ? 'text-[#D4AF37]' : 'text-gray-500'
          )}
        >
          <span className="text-lg">✉️</span>
          <span>Email</span>
        </Link>
        <Link
          href="/sales"
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs',
            pathname.startsWith('/sales') ? 'text-[#D4AF37]' : 'text-gray-500'
          )}
        >
          <span className="text-lg">📞</span>
          <span>Sales</span>
        </Link>
        <Link
          href="/calendar"
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs',
            pathname.startsWith('/calendar') ? 'text-[#D4AF37]' : 'text-gray-500'
          )}
        >
          <span className="text-lg">📅</span>
          <span>Calendar</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs text-gray-500"
        >
          <span className="text-lg">☰</span>
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
}
