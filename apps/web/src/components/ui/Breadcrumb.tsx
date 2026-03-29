import Link from 'next/link';

interface BreadcrumbProps {
  module: string;
}

/** Simple "Dashboard > Module Name" breadcrumb */
export function Breadcrumb({ module }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-600 mb-1" aria-label="Breadcrumb">
      <Link href="/dashboard" className="hover:text-gray-400 transition-colors">
        Dashboard
      </Link>
      <span className="text-gray-700">›</span>
      <span className="text-gray-400">{module}</span>
    </nav>
  );
}
