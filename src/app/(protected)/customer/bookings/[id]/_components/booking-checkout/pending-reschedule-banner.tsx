"use client";

import { CreditCard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingRescheduleRequest } from "@/services/customer/bookings/type";

interface PendingRescheduleBannerProps {
  requests: BookingRescheduleRequest[];
  formatCurrency: (amount: number) => string;
  onPay: (request: BookingRescheduleRequest) => void;
  isProcessing?: boolean;
}

export function PendingRescheduleBanner({
  requests,
  formatCurrency,
  onPay,
  isProcessing = false,
}: PendingRescheduleBannerProps) {
  if (!requests.length) return null;

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.id}
          className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-full bg-amber-100 p-2">
              <RotateCcw className="h-5 w-5 text-amber-700" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h4 className="mb-1 font-semibold text-amber-900">
                  Reschedule payment pending
                </h4>
                <p className="text-sm text-amber-800">
                  Reschedule to{" "}
                  <span className="font-semibold">{request.event_date}</span>
                  {request.unpaid_amount > 0 && (
                    <>
                      {" "}
                      —{" "}
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(request.unpaid_amount)} due
                      </span>
                    </>
                  )}
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
                disabled={isProcessing}
                onClick={() => onPay(request)}
              >
                <CreditCard className="h-3.5 w-3.5" />
                {request.unpaid_amount > 0 ? "Pay now" : "Complete reschedule"}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
