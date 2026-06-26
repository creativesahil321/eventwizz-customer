"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert, LogOut, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonationStore } from "@/store/impersonation.store";
import { useExitImpersonation } from "@/hooks/useImpersonation";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Sticky banner shown at the top of the page during active impersonation.
 * Renders nothing when not impersonating — zero overhead.
 */
export function ImpersonationBanner() {
  const { isImpersonating, impersonatedVendor, startedAt } =
    useImpersonationStore();
  const exitMutation = useExitImpersonation();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isImpersonating || !startedAt) return;

    setElapsed(Date.now() - startedAt);
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 1000);

    return () => clearInterval(interval);
  }, [isImpersonating, startedAt]);

  if (!isImpersonating || !impersonatedVendor) return null;

  return (
    <div className="sticky top-0 z-[9999] flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-md">
      <div className="flex items-center gap-2.5 min-w-0">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span className="truncate">
          Viewing as{" "}
          <strong className="font-semibold">
            {impersonatedVendor.name}
          </strong>{" "}
          <span className="hidden sm:inline text-amber-800">
            ({impersonatedVendor.email})
          </span>
        </span>
        <span className="hidden md:inline-flex items-center gap-1 text-xs text-amber-800" title="Time spent viewing this vendor's dashboard">
          <Clock className="h-3 w-3" aria-hidden />
          Viewing for {formatDuration(elapsed)}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 border-amber-700 bg-amber-600 text-white hover:bg-amber-700 hover:text-white h-7 text-xs"
        onClick={() => exitMutation.mutate()}
        disabled={exitMutation.isPending}
      >
        <LogOut className="h-3.5 w-3.5" />
        {exitMutation.isPending ? "Exiting…" : "Back to my account"}
      </Button>
    </div>
  );
}
