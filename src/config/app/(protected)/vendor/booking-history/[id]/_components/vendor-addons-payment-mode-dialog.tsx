"use client";

import { useEffect, useState } from "react";
import { Banknote, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type VendorAddonsPaymentMode = "online" | "offline";

interface VendorAddonsPaymentModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingTotalFormatted: string;
  pendingSummaryLabel: string | null;
  isSaving?: boolean;
  onConfirm: (mode: VendorAddonsPaymentMode) => void;
}

const PAYMENT_OPTIONS: Array<{
  value: VendorAddonsPaymentMode;
  title: string;
  description: string;
  icon: typeof CreditCard;
}> = [
  {
    value: "online",
    title: "Online payment",
    description: "Customer pays through the payment gateway on their booking.",
    icon: CreditCard,
  },
  {
    value: "offline",
    title: "Offline payment",
    description: "Record cash, bank transfer, or other manual payment.",
    icon: Banknote,
  },
];

export function VendorAddonsPaymentModeDialog({
  open,
  onOpenChange,
  pendingTotalFormatted,
  pendingSummaryLabel,
  isSaving = false,
  onConfirm,
}: VendorAddonsPaymentModeDialogProps) {
  const [selectedMode, setSelectedMode] =
    useState<VendorAddonsPaymentMode | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedMode(null);
    }
  }, [open]);

  const handleConfirm = () => {
    if (!selectedMode || isSaving) return;
    onConfirm(selectedMode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="gap-0 overflow-hidden border-gray-200 bg-white p-0 text-gray-900 sm:max-w-[28rem]">
        <DialogHeader className="space-y-1.5 border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
          <DialogTitle className="text-left text-lg font-bold text-gray-900">
            Confirm payment method
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed text-gray-600">
            Choose how the customer will pay for these add-ons before they are
            added to the booking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                Amount due
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
                {pendingSummaryLabel ?? "Add-ons"}
              </p>
            </div>
            <p className="shrink-0 text-xl font-extrabold tabular-nums text-gray-900">
              {pendingTotalFormatted}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {PAYMENT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = selectedMode === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isSaving}
                  onClick={() => setSelectedMode(option.value)}
                  className={cn(
                    "flex min-h-[7.5rem] flex-col items-start gap-2 rounded-xl border-2 p-3.5 text-left transition-all",
                    active
                      ? "border-[var(--color-primary)] bg-white shadow-[0_0_0_1px_var(--color-primary)]"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-slate-50",
                    isSaving && "pointer-events-none opacity-60",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      active
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-gray-100 text-gray-600",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {option.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-gray-600">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="event-outline"
            className="w-full border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="event-primary"
            className={cn(
              "w-full sm:w-auto",
              !selectedMode &&
                !isSaving &&
                "bg-gray-300 text-gray-600 border-gray-300 hover:bg-gray-300 hover:text-gray-600 hover:scale-100 shadow-none",
            )}
            onClick={handleConfirm}
            disabled={!selectedMode || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding…
              </>
            ) : (
              "Add to booking"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
