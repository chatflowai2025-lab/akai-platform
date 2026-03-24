'use client';

import { cn } from '@/lib/utils';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  onClick,
  href,
  className,
  type = 'button',
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none';

  const variants = {
    primary: 'bg-[#D4AF37] text-black hover:opacity-90 disabled:opacity-40',
    secondary: 'bg-[#111] border border-[#1f1f1f] text-white hover:border-[#D4AF37] disabled:opacity-40',
    ghost: 'text-gray-400 hover:text-white disabled:opacity-40',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-40',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-10 py-4 text-lg',
  };

  const classes = cn(base, variants[variant], sizes[size], className);

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
