"use client";

import { Copyright } from "lucide-react";
import { cn } from "@/lib/utils";

export const GALLERY_COPYRIGHT_NOTICE =
  "Placeholder photos are for layout only and may be copyrighted. Upload your own images before you publish — even if you like these pictures.";

/** Shown on gallery uploaders after AI/onboarding seeds stock photos. */
export function GalleryCopyrightNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-2.5 rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-950",
        className,
      )}
    >
      <Copyright className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{GALLERY_COPYRIGHT_NOTICE}</p>
    </div>
  );
}
