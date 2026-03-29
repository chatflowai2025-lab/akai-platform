'use client';

import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        flex items-center justify-center w-8 h-8 rounded-lg
        text-base leading-none
        transition-all duration-200
        hover:bg-white/10 active:scale-95
        ${className}
      `}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
