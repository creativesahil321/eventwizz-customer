"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  getStatusClassName,
  getStatusThemeKey,
  type StatusThemeKey,
} from "@/lib/status-theme";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCw,
  HelpCircle,
} from "lucide-react";

const STATUS_ICONS: Record<StatusThemeKey, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  pending: Clock,
  info: RotateCw,
  destructive: AlertCircle,
  neutral: HelpCircle,
};

export interface StatusBadgeProps {
  status: string;
  /** Override display text; default is status string (capitalized) */
  label?: string;
  /** Show leading icon */
  showIcon?: boolean;
  className?: string;
  /** Extra class for the icon */
  iconClassName?: string;
}

/**
 * Renders a status pill using the shared status theme (success=green, pending=amber, etc.).
 * Use everywhere we show Paid, Pending, Failed, etc. for consistent colors.
 */
export function StatusBadge({
  status,
  label,
  showIcon = true,
  className,
  iconClassName = "h-3 w-3 shrink-0",
}: StatusBadgeProps) {
  const themeKey = getStatusThemeKey(status);
  const statusClassName = getStatusClassName(status);
  const displayLabel = label ?? (status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : "");
  const Icon = STATUS_ICONS[themeKey];

  return (
    <span
      className={cn(statusClassName, "gap-1.5 [&>svg]:shrink-0", className)}
    >
      {showIcon && Icon && <Icon className={iconClassName} />}
      {displayLabel}
    </span>
  );
}
