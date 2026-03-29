/** Skeleton.tsx — shimmer loading primitives for AKAI dashboard */

interface SkeletonProps {
  className?: string;
}

/** Generic shimmer block */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[#1a1a1a] rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
}

/** 4 stat cards in a row */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-[#1a1a1a] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 bg-[#252525] rounded" />
            <div className="h-5 w-5 bg-[#252525] rounded" />
          </div>
          <div className="h-8 w-16 bg-[#252525] rounded" />
          <div className="h-2.5 w-20 bg-[#252525] rounded" />
        </div>
      ))}
    </div>
  );
}

/** Activity feed rows */
export function FeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-[#0d0d0d] border border-[#1a1a1a] border-l-2 border-l-[#2a2a2a] rounded-xl">
          <div className="w-5 h-5 bg-[#252525] rounded flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-[#252525] rounded w-4/5" />
            <div className="h-2.5 bg-[#252525] rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Single card skeleton */
export function CardSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-[#1a1a1a] rounded-2xl animate-pulse ${className}`} aria-hidden="true" />
  );
}

/** 3-column row of card skeletons */
export function CardGridSkeleton({ cols = 3, rows = 2 }: { cols?: number; rows?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${cols} gap-4 animate-pulse`}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <div key={i} className="h-32 bg-[#1a1a1a] rounded-2xl" />
      ))}
    </div>
  );
}

/** Table/list rows */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 bg-[#1a1a1a] rounded-xl">
          <div className="w-8 h-8 rounded-full bg-[#252525] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-[#252525] rounded w-2/5" />
            <div className="h-2.5 bg-[#252525] rounded w-1/3" />
          </div>
          <div className="h-5 w-16 bg-[#252525] rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Full page loading state */
export function PageSkeleton() {
  return (
    <div className="flex-1 p-8 space-y-6 animate-pulse">
      <div className="h-8 bg-[#1a1a1a] rounded-xl w-48" />
      <StatsSkeleton />
      <div className="h-64 bg-[#1a1a1a] rounded-2xl" />
    </div>
  );
}
