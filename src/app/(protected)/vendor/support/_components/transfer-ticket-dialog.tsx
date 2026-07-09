"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { TransferTicketReason } from "../_lib/types";
import { TRANSFER_REASON_LABELS } from "../_lib/utils";
import { cn } from "@/lib/utils";

const TRANSFER_REASONS = Object.keys(
  TRANSFER_REASON_LABELS
) as TransferTicketReason[];

interface TransferTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketRef: string;
}

export default function TransferTicketDialog({
  open,
  onOpenChange,
  ticketRef,
}: TransferTicketDialogProps) {
  const [reason, setReason] = useState<TransferTicketReason>("technical_issue");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsSubmitting(false);
    onOpenChange(false);
    toast.success(
      `${ticketRef} transferred to Admin technical support — ${TRANSFER_REASON_LABELS[reason]}`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="gap-5 bg-white text-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            Transfer to Admin technical support
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            The full conversation history and attachments will be shared. The
            customer will see a system note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label className="text-slate-900">Reason</Label>
          <RadioGroup
            value={reason}
            onValueChange={(value) => setReason(value as TransferTicketReason)}
            className="gap-2"
          >
            {TRANSFER_REASONS.map((key) => (
              <label
                key={key}
                htmlFor={`transfer-reason-${key}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 transition-colors hover:bg-slate-50",
                  reason === key &&
                    "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                )}
              >
                <RadioGroupItem
                  value={key}
                  id={`transfer-reason-${key}`}
                  className="shrink-0"
                />
                <span className="text-sm font-medium text-slate-900">
                  {TRANSFER_REASON_LABELS[key]}
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900 sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="event-primary"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Transferring..." : "Confirm transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
