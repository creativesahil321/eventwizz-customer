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
import type { CloseTicketReason, SupportSource } from "../_lib/types";
import {
  getCloseTicketReasonLabel,
  getCloseTicketReopenDescription,
} from "../_lib/utils";
import { cn } from "@/lib/utils";

const CLOSE_REASONS: CloseTicketReason[] = [
  "issue_resolved",
  "duplicate_ticket",
  "customer_no_response",
];

interface CloseTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketRef: string;
  source: SupportSource;
  onClosed?: () => void;
}

export default function CloseTicketDialog({
  open,
  onOpenChange,
  ticketRef,
  source,
  onClosed,
}: CloseTicketDialogProps) {
  const [reason, setReason] = useState<CloseTicketReason>("issue_resolved");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsSubmitting(false);
    onOpenChange(false);
    onClosed?.();
    toast.success(
      `${ticketRef} closed — ${getCloseTicketReasonLabel(reason, source)}`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="gap-5 bg-white text-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Close this ticket?</DialogTitle>
          <DialogDescription className="text-slate-600">
            {getCloseTicketReopenDescription(source)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label className="text-slate-900">Resolution</Label>
          <RadioGroup
            value={reason}
            onValueChange={(value) => setReason(value as CloseTicketReason)}
            className="gap-2"
          >
            {CLOSE_REASONS.map((key) => (
              <label
                key={key}
                htmlFor={`admin-close-reason-${key}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 transition-colors hover:bg-slate-50",
                  reason === key &&
                    "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                )}
              >
                <RadioGroupItem
                  value={key}
                  id={`admin-close-reason-${key}`}
                  className="shrink-0"
                />
                <span className="text-sm font-medium text-slate-900">
                  {getCloseTicketReasonLabel(key, source)}
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
            {isSubmitting ? "Closing..." : "Close ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
