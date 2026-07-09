"use client";

import { RotateCcw } from "lucide-react";

interface VendorRescheduleInitiatedBannerProps {
  dateLabel?: string;
  previousDateLabel?: string | null;
  compact?: boolean;
}

export function VendorRescheduleInitiatedBanner({
  dateLabel,
  previousDateLabel,
  compact = false,
}: VendorRescheduleInitiatedBannerProps) {
  const previous = previousDateLabel?.trim();

  const description = previous
    ? `Originally booked for ${previous}. The reschedule is in progress — awaiting customer confirmation or payment.`
    : dateLabel
      ? `Reschedule initiated for ${dateLabel}. Awaiting customer confirmation or payment.`
      : "A reschedule has been initiated on this booking. Awaiting customer confirmation or payment.";

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
        <RotateCcw className="h-3 w-3" />
        Reschedule initiated
      </span>
    );
  }

  return (
    <div className="rounded-xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-blue-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-full bg-sky-100 p-2">
          <RotateCcw className="h-5 w-5 text-sky-700" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="mb-1 font-semibold text-sky-900">
            Reschedule already initiated
          </h4>
          <p className="text-sm text-sky-800">{description}</p>
        </div>
      </div>
    </div>
  );
}
