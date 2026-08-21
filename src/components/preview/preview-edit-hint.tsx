"use client";

import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

/** Hover ring + wash for a click-to-edit preview region. */
export function PreviewEditHoverFrame({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-20 rounded-sm transition-[background-color,box-shadow] duration-200",
        "group-hover/preview-edit:bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)]",
        "group-hover/preview-edit:shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--color-primary)_70%,transparent)]",
        className,
      )}
      aria-hidden
    />
  );
}

/** Pencil chip that appears on hover. Clicks bubble to the section wrapper. */
export function PreviewEditHoverBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      data-preview-edit-hit=""
      className={cn(
        "pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-slate-950/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white shadow-lg ring-1 ring-white/15 backdrop-blur-sm",
        "origin-top-right scale-95 opacity-0 transition-[opacity,transform] duration-200",
        "group-hover/preview-edit:scale-100 group-hover/preview-edit:opacity-100",
        className,
      )}
    >
      <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Edit {label}
    </span>
  );
}
