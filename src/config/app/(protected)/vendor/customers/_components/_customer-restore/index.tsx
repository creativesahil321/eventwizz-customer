"use client";
import { Customer } from "../../_lib/types";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { PageLoader } from "@/components/ui/page-loader";
import { useRestoreCustomer } from "../../_lib/queries";

interface RestoreCustomerDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  customer: Customer | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}

export function RestoreCustomerDialog({
  customer,
  showTrigger = true,
  onSuccess,
  ...props
}: RestoreCustomerDialogProps) {
  const restoreCustomerMutation = useRestoreCustomer();
  const isDesktop = useMediaQuery("(min-width: 640px)");

  function onRestore() {
    if (!customer?.id) {
      toast.error("Customer ID is required");
      return;
    }

    restoreCustomerMutation.mutate(customer.id, {
      onSuccess: () => {
        // Success toast is handled by API interceptor
        props.onOpenChange?.(false);
        if (typeof onSuccess === "function") {
          onSuccess();
        }
      },
      onError: (error: Error) => {
        console.error("Error restoring customer:", error);
        toast.error("Failed to restore customer");
      },
    });
  }

  if (isDesktop) {
    return (
      <Dialog {...props}>
        {showTrigger ? (
          <DialogTrigger asChild>
            <Button variant="event-outline" size="sm">
              <RotateCcw className="mr-2 size-4" aria-hidden="true" />
              Restore ({customer?.first_name})
            </Button>
          </DialogTrigger>
        ) : null}
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle className="text-black">Restore Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this customer? They will be able
              to access their account again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <DialogClose asChild>
              <Button variant="event-outline">Cancel</Button>
            </DialogClose>
            <Button
              aria-label="Restore selected customer"
              variant="event-primary"
              onClick={onRestore}
              disabled={restoreCustomerMutation.isPending}
            >
              {restoreCustomerMutation.isPending && <PageLoader />}
              {restoreCustomerMutation.isPending ? "Restoring..." : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer {...props}>
      {showTrigger ? (
        <DrawerTrigger asChild>
          <Button variant="event-outline" size="sm">
            <RotateCcw className="mr-2 size-4" aria-hidden="true" />
            Restore ({customer?.first_name})
          </Button>
        </DrawerTrigger>
      ) : null}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-black">Restore Customer</DrawerTitle>
          <DrawerDescription>
            Are you sure you want to restore this customer? They will be able to
            access their account again.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="gap-2 sm:space-x-0">
          <DrawerClose asChild>
            <Button variant="event-outline">Cancel</Button>
          </DrawerClose>
          <Button
            aria-label="Restore selected customer"
            variant="event-primary"
            onClick={onRestore}
            disabled={restoreCustomerMutation.isPending}
          >
            {restoreCustomerMutation.isPending && <PageLoader />}
            {restoreCustomerMutation.isPending ? "Restoring..." : "Restore"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
