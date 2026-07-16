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
  useEscalateVendorSupportTicket,
  type EscalateVendorSupportTicketData,
} from "@/services/vendor/support";
import { normalizeSupportStatus } from "@/app/(protected)/customer/support/_lib/utils";
import type { SupportStatus } from "../_lib/types";

interface TransferTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketRef: string;
  onEscalated?: (result: {
    status: SupportStatus;
    canReply: boolean;
    data: EscalateVendorSupportTicketData;
  }) => void;
}

export default function TransferTicketDialog({
  open,
  onOpenChange,
  ticketRef,
  onEscalated,
}: TransferTicketDialogProps) {
  const escalateTicket = useEscalateVendorSupportTicket();

  const handleConfirm = () => {
    escalateTicket.mutate(ticketRef, {
      onSuccess: (response) => {
        const data = response.data;
        onOpenChange(false);
        onEscalated?.({
          status: normalizeSupportStatus(data?.status),
          canReply: Boolean(data?.can_reply),
          data,
        });
        toast.success(
          response.message?.trim() ||
            `${ticketRef} transferred to technical support`
        );
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="gap-5 bg-white text-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            Transfer to technical support
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Send this ticket to Admin technical support. The full conversation
            history and attachments will be shared. The customer will see a
            system note.
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
            {escalateTicket.isPending
              ? "Transferring..."
              : "Send to technical support"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
