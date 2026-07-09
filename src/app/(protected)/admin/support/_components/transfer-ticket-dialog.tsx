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

interface TransferTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketRef: string;
  venueName: string;
}

export default function TransferTicketDialog({
  open,
  onOpenChange,
  ticketRef,
  venueName,
}: TransferTicketDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsSubmitting(false);
    onOpenChange(false);
    toast.success(`${ticketRef} sent to ${venueName} vendor team`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="gap-5 bg-white text-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Send to vendor</DialogTitle>
          <DialogDescription className="text-slate-600">
            Send this customer ticket to {venueName}. The full conversation
            history will be shared with the venue team.
          </DialogDescription>
        </DialogHeader>

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
            {isSubmitting ? "Sending..." : "Send to vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
