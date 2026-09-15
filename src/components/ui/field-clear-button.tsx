"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldClearButtonProps = {
  onClick: () => void;
  label?: string;
  variant?: "default" | "dark";
  className?: string;
};

/** Visible circular X for Google address / venue search fields. */
export function FieldClearButton({
  onClick,
  label = "Clear address",
  variant = "default",
  className,
}: FieldClearButtonProps) {
  const isDark = variant === "dark";

  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition-colors",
        isDark
          ? "border-white/30 bg-slate-800 text-white hover:border-red-400/70 hover:bg-red-500/30 hover:text-red-100"
          : "border-gray-300 bg-white text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-600",
        className,
      )}
    >
      <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
    </button>
  );
}
