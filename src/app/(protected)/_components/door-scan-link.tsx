"use client";

import Link from "next/link";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/permission";
import { cn } from "@/lib/utils";

type DoorScanLinkProps = {
  compact?: boolean;
  className?: string;
};

export function DoorScanLink({ compact = false, className }: DoorScanLinkProps) {
  return (
    <PermissionGuard permissionKey="read-booking">
      <Button
        asChild
        variant={compact ? "event-outline" : "outline"}
        className={cn(
          "shrink-0",
          compact &&
            "flex h-9 items-center gap-1.5 px-2.5 text-xs font-semibold sm:h-10 sm:px-3 sm:text-sm",
          className,
        )}
      >
        <Link href="/vendor/door-scan" aria-label="Door Scan">
          <QrCode className="h-4 w-4 shrink-0" />
          {compact ? (
            <span className="hidden xl:inline">Door Scan</span>
          ) : (
            "Door Scan"
          )}
        </Link>
      </Button>
    </PermissionGuard>
  );
}
