interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
}

export default function StatCard({ label, value, delta }: StatCardProps) {
  const isPositive = delta?.startsWith('+');

  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
      {delta && (
        <p className={`text-xs mt-1 font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {delta} today
        </p>
      )}
    </div>
  );
}
