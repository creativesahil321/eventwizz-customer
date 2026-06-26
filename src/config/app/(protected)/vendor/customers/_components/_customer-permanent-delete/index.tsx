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
import { Trash2 } from "lucide-react";
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
import { usePermanentDeleteCustomer } from "../../_lib/queries";

interface PermanentDeleteCustomerDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  customer: Customer | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}

export function PermanentDeleteCustomerDialog({
  customer,
  showTrigger = true,
  onSuccess,
  ...props
}: PermanentDeleteCustomerDialogProps) {
  const permanentDeleteMutation = usePermanentDeleteCustomer();
  const isDesktop = useMediaQuery("(min-width: 640px)");

  function onPermanentDelete() {
    if (!customer?.id) {
      toast.error("Customer ID is required");
      return;
    }

    permanentDeleteMutation.mutate(customer.id, {
      onSuccess: () => {
        // Success toast is handled by API interceptor
        props.onOpenChange?.(false);
        if (typeof onSuccess === "function") {
          onSuccess();
        }
      },
      onError: (error: Error) => {
        console.error("Error permanently deleting customer:", error);
        toast.error("Failed to permanently delete customer");
      },
    });
  }

  if (isDesktop) {
    return (
      <Dialog {...props}>
        {showTrigger ? (
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 size-4" aria-hidden="true" />
              Permanent Delete ({customer?.first_name})
            </Button>
          </DialogTrigger>
        ) : null}
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle className="text-black">
              Permanently Delete Customer
            </DialogTitle>
            <DialogDescription>
              <strong className="text-red-600">WARNING:</strong> This action
              cannot be undone. This will permanently delete the customer and
              all their data from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <DialogClose asChild>
              <Button variant="event-outline">Cancel</Button>
            </DialogClose>
            <Button
              aria-label="Permanently delete selected customer"
              variant="destructive"
              onClick={onPermanentDelete}
              disabled={permanentDeleteMutation.isPending}
            >
              {permanentDeleteMutation.isPending && <PageLoader />}
              {permanentDeleteMutation.isPending
                ? "Deleting..."
                : "Permanent Delete"}
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
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 size-4" aria-hidden="true" />
            Permanent Delete ({customer?.first_name})
          </Button>
        </DrawerTrigger>
      ) : null}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-black">
            Permanently Delete Customer
          </DrawerTitle>
          <DrawerDescription>
            <strong className="text-red-600">WARNING:</strong> This action
            cannot be undone. This will permanently delete the customer and all
            their data from the system.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="gap-2 sm:space-x-0">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
          <Button
            aria-label="Permanently delete selected customer"
            variant="destructive"
            onClick={onPermanentDelete}
            disabled={permanentDeleteMutation.isPending}
          >
            {permanentDeleteMutation.isPending && <PageLoader />}
            {permanentDeleteMutation.isPending
              ? "Deleting..."
              : "Permanent Delete"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
