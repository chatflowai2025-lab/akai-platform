'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const MODULES = [
  { id: 'sales', icon: '📞', label: 'Sales', status: 'live', href: '/sales', external: false },
  { id: 'recruit', icon: '🎯', label: 'Recruit', status: 'building', href: '/recruit', external: false },
  { id: 'web', icon: '🌐', label: 'Web', status: 'building', href: '/web', external: false },
  { id: 'ads', icon: '📣', label: 'Ads', status: 'planned', href: '/ads', external: false },
  { id: 'social', icon: '📱', label: 'Social', status: 'planned', href: '/social', external: false },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, external: boolean) => {
    if (external) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-[#080808] border-r border-[#1f1f1f] flex flex-col h-full overflow-y-auto">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1f1f1f]">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-black tracking-tight">AK<span className="text-[#F59E0B]">AI</span></span>
          </Link>
        </div>
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
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                  : 'text-gray-400 hover:text-white hover:bg-[#111]'
              )}
            >
              <span>{mod.icon}</span>
              <span>{mod.label}</span>
              {mod.status === 'building' && (
                <span className="ml-auto text-xs text-yellow-500/60">Beta</span>
              )}
              {mod.external && (
                <span className="ml-auto text-xs text-gray-600">↗</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#1f1f1f] space-y-1">
        <Link
          href="/settings"
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
        <Link
          href="/ask"
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
            pathname === '/ask'
              ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
              : 'text-gray-400 hover:text-white hover:bg-[#111]'
          )}
        >
          <span>💬</span>
          <span>Ask AK</span>
        </Link>
      </div>
    </aside>
  );
}
