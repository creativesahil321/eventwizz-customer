"use client";

import { useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { History } from "../../_lib/types";
import { useBulkEmailSend } from "../../_lib/queries";
import { toast } from "sonner";

interface MailHistoryDialogProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof Dialog>,
    "open" | "onOpenChange"
  > {
  history: History | null;
  showTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function MailHistoryDialog({
  history,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  ...props
}: MailHistoryDialogProps) {
  const [emailData, setEmailData] = useState({ subject: "", body: "" });
  const bulkEmailMutation = useBulkEmailSend();
  const singleEmailInProgressRef = useRef(false);

  const bookingId = history ? history.booking_id ?? history.id : null;
  const isOpen = controlledOpen ?? false;

  useEffect(() => {
    if (!isOpen) {
      setEmailData({ subject: "", body: "" });
    }
  }, [isOpen]);

  const handleSendEmail = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (
      !bookingId ||
      singleEmailInProgressRef.current ||
      bulkEmailMutation.isPending
    ) {
      return;
    }

    const bodyText = emailData.body.replace(/<[^>]*>/g, "").trim();
    if (!emailData.subject.trim() || !bodyText) {
      toast.error("Please provide both subject and body");
      return;
    }

    singleEmailInProgressRef.current = true;
    try {
      await bulkEmailMutation.mutateAsync({
        bookingIds: [bookingId],
        subject: emailData.subject,
        body: emailData.body,
      });
      onOpenChange?.(false);
      setEmailData({ subject: "", body: "" });
      onSuccess?.();
    } catch (error: unknown) {
      console.error("Single email error:", error);
    } finally {
      singleEmailInProgressRef.current = false;
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !bulkEmailMutation.isPending) {
      setEmailData({ subject: "", body: "" });
    }
    onOpenChange?.(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} {...props}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden text-black">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>
            Send email to the customer for this booking. You can use
            placeholders like {"{name}"} in the body.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="single-email-subject">Subject</Label>
            <Input
              id="single-email-subject"
              placeholder="Your Booking Update is here"
              value={emailData.subject}
              onChange={(e) =>
                setEmailData((prev) => ({ ...prev, subject: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="single-email-body">Body</Label>
            <TiptapEditor
              value={emailData.body}
              onChange={(html) =>
                setEmailData((prev) => ({ ...prev, body: html }))
              }
              placeholder="Hello {name}, your booking has been updated..."
              maxLength={5000}
              maxWords={1000}
              showAIButton
              className="min-h-[200px]"
              aiContext={{
                title: "Booking email",
                description:
                  "Email to customer about their booking. Use placeholders like {name} for the customer name.",
              }}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{name}"} as a placeholder for the customer&apos;s name
            </p>
          </div>
        </div>
        <DialogFooter className="flex-shrink-0">
          <Button
            type="button"
            variant="event-outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="event-primary"
            onClick={(e) => handleSendEmail(e)}
            disabled={bulkEmailMutation.isPending}
          >
            {bulkEmailMutation.isPending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
