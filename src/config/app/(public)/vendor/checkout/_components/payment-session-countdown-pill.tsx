"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPaymentCountdown } from "../_lib/use-payment-session-countdown";

interface PaymentSessionCountdownPillProps {
  secondsLeft: number;
  size?: "sm" | "md";
  className?: string;
}

export function PaymentSessionCountdownPill({
  secondsLeft,
  size = "sm",
  className,
}: PaymentSessionCountdownPillProps) {
  const isUrgent = secondsLeft <= 60;
  const isWarning = secondsLeft <= 300 && !isUrgent;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold tabular-nums whitespace-nowrap",
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs font-semibold",
        isUrgent
          ? "bg-red-100 text-red-700"
          : isWarning
            ? "bg-orange-100 text-orange-700"
            : "bg-amber-100 text-amber-800",
        className,
      )}
      aria-live="polite"
      aria-label={`${formatPaymentCountdown(secondsLeft)} remaining`}
    >
      <Clock className={size === "md" ? "h-4 w-4 shrink-0" : "h-3.5 w-3.5 shrink-0"} />
      <span>{formatPaymentCountdown(secondsLeft)}</span>
      <span className="font-semibold opacity-90">left</span>
    </span>
  );
}
