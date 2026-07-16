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
import type { CloseTicketReason } from "../_lib/types";
import { CLOSE_TICKET_REASON_LABELS } from "../_lib/utils";
import { useCloseVendorSupportTicket } from "@/services/vendor/support";
import { cn } from "@/lib/utils";

const CLOSE_REASONS = Object.keys(
  CLOSE_TICKET_REASON_LABELS
) as CloseTicketReason[];

interface CloseTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketRef: string;
  onClosed?: () => void;
}

export default function CloseTicketDialog({
  open,
  onOpenChange,
  ticketRef,
  onClosed,
}: CloseTicketDialogProps) {
  const [reason, setReason] = useState<CloseTicketReason>("issue_resolved");
  const closeTicket = useCloseVendorSupportTicket();

  const handleConfirm = () => {
    closeTicket.mutate(
      {
        ticketKey: ticketRef,
        closed_reason: reason,
      },
      {
        onSuccess: (response) => {
          onOpenChange(false);
          onClosed?.();
          toast.success(
            response.message?.trim() ||
              `${ticketRef} closed — ${CLOSE_TICKET_REASON_LABELS[reason]}`
          );
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="gap-5 bg-white text-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Close this ticket?</DialogTitle>
          <DialogDescription className="text-slate-600">
            The customer can reopen this ticket for the next 14 days by replying
            to the thread.
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
                htmlFor={`close-reason-${key}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 transition-colors hover:bg-slate-50",
                  reason === key &&
                    "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                )}
              >
                <RadioGroupItem
                  value={key}
                  id={`close-reason-${key}`}
                  className="shrink-0"
                />
                <span className="text-sm font-medium text-slate-900">
                  {CLOSE_TICKET_REASON_LABELS[key]}
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
            disabled={closeTicket.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="event-primary"
            disabled={closeTicket.isPending}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {closeTicket.isPending ? "Closing..." : "Close ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
