'use client';

import { cn } from '@/lib/utils';

const MODULES = [
  { id: 'sales', icon: '📞', label: 'Sales', status: 'live' },
  { id: 'recruit', icon: '🎯', label: 'Recruit', status: 'building' },
  { id: 'web', icon: '🌐', label: 'Web', status: 'building' },
  { id: 'ads', icon: '📣', label: 'Ads', status: 'planned' },
  { id: 'social', icon: '📱', label: 'Social', status: 'planned' },
];

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

export default function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-[#080808] border-r border-[#1f1f1f] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1f1f1f]">
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <span className="text-xl font-black tracking-tight">AK<span className="text-[#F59E0B]">AI</span></span>
          </a>
        </div>
      </div>

      {/* Modules Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-xs text-gray-600 uppercase tracking-wider px-3 mb-3">Modules</p>
        {MODULES.map(mod => (
          <button
            key={mod.id}
            onClick={() => onModuleChange(mod.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              activeModule === mod.id
                ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                : 'text-gray-400 hover:text-white hover:bg-[#111]'
            )}
          >
            <span>{mod.icon}</span>
            <span>{mod.label}</span>
            {mod.status === 'building' && (
              <span className="ml-auto text-xs text-yellow-500/60">Beta</span>
            )}
            {mod.status === 'planned' && (
              <span className="ml-auto text-xs text-gray-600">Soon</span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#1f1f1f] space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-[#111] transition-colors">
          <span>⚙️</span>
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-[#111] transition-colors">
          <span>💬</span>
          <span>Ask AK</span>
        </button>
      </div>
    </aside>
  );
}
