"use client";

import { cn } from "@/lib/utils";

export interface TableTab {
  id: number;
  label: string;
  people: number;
  capacity: number;
}

interface TableTabBarProps {
  tabs: TableTab[];
  activeTabId: number;
  onTabChange: (id: number) => void;
  completedCounts: Record<number, number>;
}

export default function TableTabBar({
  tabs,
  activeTabId,
  onTabChange,
  completedCounts,
}: TableTabBarProps) {
  if (tabs.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto">
      {tabs.map((tab) => {
        const completed = completedCounts[tab.id] ?? 0;
        const isFull = completed >= tab.people;
        const isActive = tab.id === activeTabId;

        return (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium border transition-all cursor-pointer",
              isActive
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-900 hover:text-gray-900",
            )}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            <span
              className={cn(
                "text-[11px] font-semibold px-2 py-0.5 rounded-full leading-tight",
                isActive
                  ? "bg-white/20 text-white"
                  : isFull
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-500",
              )}
            >
              {completed}/{tab.people}
            </span>
          </button>
        );
      })}
    </div>
  );
}
