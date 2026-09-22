"use client";

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
import {
  useEscalateAdminSupportTicket,
  type EscalateAdminSupportTicketData,
} from "@/services/admin/support";
import { normalizeSupportStatus } from "@/app/(protected)/admin/support/_lib/utils";
import type { SupportStatus } from "../_lib/types";

interface TransferTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketRef: string;
  venueName?: string;
  onTransferred?: (result: {
    status: SupportStatus;
    canReply: boolean;
    data?: EscalateAdminSupportTicketData;
  }) => void;
}

export default function TransferTicketDialog({
  open,
  onOpenChange,
  ticketRef,
  venueName,
  onTransferred,
}: TransferTicketDialogProps) {
  const escalateTicket = useEscalateAdminSupportTicket();
  const venueLabel = venueName?.trim() || "the venue";

  const handleConfirm = () => {
    escalateTicket.mutate(ticketRef, {
      onSuccess: (response) => {
        const data = response.data;
        onOpenChange(false);
        onTransferred?.({
          status: normalizeSupportStatus(
            data?.status ?? "waiting_general_support"
          ),
          canReply: Boolean(data?.can_reply),
          data,
        });
        toast.success(
          response.message?.trim() ||
            `${ticketRef} transferred to ${venueLabel}`
        );
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="gap-5 bg-white text-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            Transfer to vendor
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Send this ticket to {venueLabel}. The venue team will be able to
            reply. The customer will see a system note.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900 sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={escalateTicket.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="event-primary"
            disabled={escalateTicket.isPending}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {escalateTicket.isPending ? "Transferring..." : "Send to vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
