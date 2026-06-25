"use client";

interface StatusBarProps {
  completed: number;
  total: number;
}

export default function StatusBar({ completed, total }: StatusBarProps) {
  const pending = Math.max(0, total - completed);

  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
        {completed} Completed
      </span>
      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        {pending} Pending
      </span>
    </div>
  );
}
