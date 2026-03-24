import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export default function Card({ children, className, padding = 'md', hover = false }: CardProps) {
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'bg-[#111] border border-[#1f1f1f] rounded-2xl',
        paddings[padding],
        hover && 'hover:border-[#D4AF37]/40 transition-colors duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}
