"use client";
import * as React from "react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Trash } from "lucide-react";
import MailForm, { CUSTOMER_MAIL_FORM_ID } from "./mail-form";
import { Customer } from "../../_lib/types";
import { Button } from "@/components/ui/button";

interface MailCustomerDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  customer: Customer | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}
export function MailCustomerDialog({
  customer,
  showTrigger = true,
  onSuccess,
  onOpenChange,
  ...props
}: MailCustomerDialogProps) {
  const [isPending, setIsPending] = useState(false);

  if (!customer) {
    return null;
  }
  const fullName = customer?.first_name + " " + customer?.last_name;
  const onSubmitHandler = () => {
    onSuccess?.();
    onOpenChange?.(false);
  };
  return (
    <Dialog onOpenChange={onOpenChange} {...props}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button variant="event-outline" size="sm">
            <Trash className="mr-2 size-4" aria-hidden="true" />
            Send Mail to {fullName}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="border border-gray-300 dark:border-border bg-background text-foreground max-h-[min(90vh,calc(100vh-7rem))] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="text-black">
            Send Mail to {fullName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
          <MailForm
            customer={customer}
            onSubmitHandler={onSubmitHandler}
            onPendingChange={setIsPending}
          />
        </div>
        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t">
          <Button
            type="button"
            variant="event-outline"
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button>
          <Button
            form={CUSTOMER_MAIL_FORM_ID}
            type="submit"
            variant="event-primary"
            disabled={isPending}
          >
            {isPending ? "Sending..." : "Send Mail"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
