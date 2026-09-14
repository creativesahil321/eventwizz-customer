"use client";

import type { MouseEvent, ReactNode } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const PREVIEW_EDIT_SKIP = "a, input, textarea, select, [data-preview-no-edit]";

export function shouldIgnorePreviewEditClick(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(PREVIEW_EDIT_SKIP));
}

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

/** Hover highlight + “Edit …” chip. Used by onboarding event and location previews. */
export function PreviewEditRegion({
  label,
  onEdit,
  children,
  className,
  skipButtons = false,
  hoverFrameClassName,
  badgePositionClassName,
}: {
  label: string;
  onEdit: () => void;
  children: ReactNode;
  className?: string;
  skipButtons?: boolean;
  hoverFrameClassName?: string;
  badgePositionClassName?: string;
}) {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    // Nested edit chips (glance facts, hero meta) own the click.
    if (event.target instanceof Element) {
      const nestedRegion = event.target.closest("[data-preview-edit-region]");
      if (nestedRegion && nestedRegion !== event.currentTarget) return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest("[data-preview-edit-hit]")
    ) {
      onEdit();
      return;
    }
    if (shouldIgnorePreviewEditClick(event.target)) return;
    if (
      skipButtons &&
      event.target instanceof Element &&
      event.target.closest("button")
    ) {
      return;
    }
    onEdit();
  };

  return (
    <div
      data-preview-edit-region=""
      title={`Click to edit ${label}`}
      onClick={handleClick}
      className={cn(
        "group/preview-edit relative isolate cursor-pointer rounded-sm",
        className,
      )}
    >
      <PreviewEditHoverFrame className={hoverFrameClassName} />
      <div
        className={cn(
          "pointer-events-none absolute z-30",
          badgePositionClassName ?? "right-3 top-3",
        )}
      >
        <PreviewEditHoverBadge label={label} />
      </div>
      {children}
    </div>
  );
}
