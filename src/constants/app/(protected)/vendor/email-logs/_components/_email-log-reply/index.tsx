"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Trash } from "lucide-react";
import { EmailLog } from "../../_lib/types";
import MailForm from "./form";

interface MailDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  email: EmailLog | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}

export function EmailReplyDialog({
  email,
  showTrigger = true,
  onOpenChange,
  onSuccess,
  ...props
}: MailDialogProps) {
  const fullName = email?.role;

  const handleSuccess = () => {
    onOpenChange?.(false);
    onSuccess?.();
  };

  return (
    <Dialog onOpenChange={onOpenChange} {...props}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button variant="event-primary" size="sm">
            <Trash className="mr-2 size-4" aria-hidden="true" />
            Send Mail
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="border-none bg-background dark:border text-foreground max-h-[min(90vh,calc(100vh-7rem))] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="text-foreground">
            <span>Reply to </span>
            <span className="capitalize">{fullName}</span>
          </DialogTitle>
        </DialogHeader>
        {email && (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
            <MailForm email={email} onSuccess={handleSuccess} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
