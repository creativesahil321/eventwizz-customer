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
import type { CloseTicketReason, SupportSource, SupportStatus } from "../_lib/types";
import {
  getCloseTicketReasonLabel,
  getCloseTicketReopenDescription,
} from "../_lib/utils";
import { useCloseAdminSupportTicket } from "@/services/admin/support";
import { normalizeSupportStatus } from "@/app/(protected)/customer/support/_lib/utils";
import { cn } from "@/lib/utils";

const CLOSE_REASONS: CloseTicketReason[] = [
  "issue_resolved",
  "duplicate_ticket",
  "customer_didnt_respond",
];

interface CloseTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketRef: string;
  source: SupportSource;
  onClosed?: (status: SupportStatus) => void;
}

export default function CloseTicketDialog({
  open,
  onOpenChange,
  ticketRef,
  source,
  onClosed,
}: CloseTicketDialogProps) {
  const [reason, setReason] = useState<CloseTicketReason>("issue_resolved");
  const closeTicket = useCloseAdminSupportTicket();

  const handleConfirm = () => {
    closeTicket.mutate(
      {
        ticketKey: ticketRef,
        closed_reason: reason,
      },
      {
        onSuccess: (response) => {
          onOpenChange(false);
          const nextStatus = normalizeSupportStatus(
            typeof response.data?.status === "string"
              ? response.data.status
              : "closed"
          );
          onClosed?.(nextStatus);
          toast.success(
            response.message?.trim() ||
              `${ticketRef} closed — ${getCloseTicketReasonLabel(reason, source)}`
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
            {getCloseTicketReopenDescription(source)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label className="text-slate-900">Closure reason</Label>
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
            disabled={closeTicket.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="event-primary"
            disabled={closeTicket.isPending || !reason}
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
