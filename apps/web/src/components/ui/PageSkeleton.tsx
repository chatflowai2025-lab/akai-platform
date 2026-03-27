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
