export function PageSkeleton() {
  return (
    <div className="flex-1 p-8 space-y-6 animate-pulse">
      <div className="h-8 bg-[#1a1a1a] rounded-xl w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[#1a1a1a] rounded-2xl" />)}
      </div>
      <div className="h-64 bg-[#1a1a1a] rounded-2xl" />
    </div>
  );
}

/** 5 rows of shimmer — for list/table views */
export function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse p-2">
      {[1, 2, 3, 4, 5].map(i => (
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

/** 3×2 grid of shimmer cards */
export function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-32 bg-[#1a1a1a] rounded-2xl" />
      ))}
    </div>
  );
}

/** 4 shimmer stat blocks in a row */
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
