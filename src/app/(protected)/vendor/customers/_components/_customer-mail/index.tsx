"use client";
import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Trash } from "lucide-react";
import MailForm from "./mail-form";
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
      <DialogContent className="border border-gray-300 dark:border-border bg-background text-foreground">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-black">
            Send Mail to {fullName}
          </DialogTitle>
          <MailForm customer={customer} onSubmitHandler={onSubmitHandler} />
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
