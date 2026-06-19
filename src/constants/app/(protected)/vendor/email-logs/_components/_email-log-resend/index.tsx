"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RotateCw } from "lucide-react";
import { EmailLog } from "../../_lib/types";
import { useResendEmail } from "../../_lib/queries";

interface ResendEmailDialogProps {
  email: EmailLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ResendEmailDialog({
  email,
  open,
  onOpenChange,
  onSuccess,
}: ResendEmailDialogProps) {
  const resendMutation = useResendEmail();

  const handleResend = async () => {
    if (!email?.id) return;

    try {
      await resendMutation.mutateAsync({ id: email.id });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error handled by API interceptor
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle>Resend email</AlertDialogTitle>
          <AlertDialogDescription>
            Resend the original email to{" "}
            <span className="font-medium text-foreground">
              {email?.emailTo ?? "—"}
            </span>
            ? This will send the same email again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={resendMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="event-primary"
            onClick={handleResend}
            disabled={resendMutation.isPending}
          >
            <RotateCw
              className={`mr-2 size-4 ${resendMutation.isPending ? "animate-spin" : ""}`}
            />
            {resendMutation.isPending ? "Resending..." : "Resend"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
