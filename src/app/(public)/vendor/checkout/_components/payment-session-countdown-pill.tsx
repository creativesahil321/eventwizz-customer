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
        "inline-flex shrink-0 items-center gap-1 rounded-full font-bold tabular-nums",
        size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-[11px] font-semibold",
        isUrgent
          ? "bg-red-100 text-red-700"
          : isWarning
            ? "bg-orange-100 text-orange-700"
            : "bg-amber-100 text-amber-700",
        className,
      )}
      aria-live="polite"
      aria-label={`${formatPaymentCountdown(secondsLeft)} remaining`}
    >
      <Clock className={size === "md" ? "h-4 w-4" : "h-3 w-3"} />
      {formatPaymentCountdown(secondsLeft)}
    </span>
  );
}
