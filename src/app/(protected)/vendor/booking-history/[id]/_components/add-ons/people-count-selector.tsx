"use client";

import { Button } from "@/components/ui/button";
import { Users, Plus, Minus } from "lucide-react";

interface PeopleCountSelectorProps {
  count: number;
  inputValue: string;
  onCountChange: (delta: number) => void;
  onInputChange: (value: string) => void;
  onInputBlur: () => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function PeopleCountSelector({
  count,
  inputValue,
  onCountChange,
  onInputChange,
  onInputBlur,
  onInputKeyDown,
}: PeopleCountSelectorProps) {
  return (
    <div className="flex flex-col gap-3 p-2.5 bg-blue-50 rounded-lg border border-blue-200 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <Users className="h-3.5 w-3.5 shrink-0 text-blue-600" />
        <span className="text-xs font-medium text-blue-900">
          People in group:
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCountChange(-1)}
          disabled={count <= 0}
          className="h-7 w-7 p-0 rounded-full"
        >
          <Minus className="h-3 w-3" />
        </Button>

        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onBlur={onInputBlur}
          onKeyDown={onInputKeyDown}
          className="text-base font-semibold text-center w-16 bg-white border rounded px-2 py-1 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => onCountChange(1)}
          disabled={count >= 100}
          className="h-7 w-7 p-0 rounded-full"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
