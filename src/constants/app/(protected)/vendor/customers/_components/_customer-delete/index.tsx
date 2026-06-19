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
import { Trash } from "lucide-react";
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
import { useDeleteCustomer } from "../../_lib/queries";

interface DeleteCustomerDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  customer: Customer | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}

export function DeleteCustomerDialog({
  customer,
  showTrigger = true,
  onSuccess,
  ...props
}: DeleteCustomerDialogProps) {
  const deleteCustomerMutation = useDeleteCustomer();
  const isDesktop = useMediaQuery("(min-width: 640px)");

  function onDelete() {
    if (!customer?.id) {
      toast.error("Customer ID is required");
      return;
    }

    deleteCustomerMutation.mutate(customer.id, {
      onSuccess: () => {
        // Success toast is handled by API interceptor
        props.onOpenChange?.(false);
        if (typeof onSuccess === "function") {
          onSuccess();
        }
      },
      onError: (error: Error) => {
        console.error("Error deleting customer:", error);
        toast.error("Failed to delete customer");
      },
    });
  }
  if (isDesktop) {
    return (
      <Dialog {...props}>
        {showTrigger ? (
          <DialogTrigger asChild>
            <Button variant="event-outline" size="sm">
              <Trash className="mr-2 size-4" aria-hidden="true" />
              Move to Deleted ({customer?.first_name})
            </Button>
          </DialogTrigger>
        ) : null}
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle className="text-black">
              Soft delete — move to deleted list?
            </DialogTitle>
            <DialogDescription>
              This is not a permanent delete. The customer will be moved to your
              deleted list and can be restored anytime from the &quot;Soft Deleted&quot;
              filter. Your system never permanently deletes customers from here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <DialogClose asChild>
              <Button variant="event-outline">Cancel</Button>
            </DialogClose>
            <Button
              aria-label="Soft delete selected customer"
              variant="destructive"
              onClick={onDelete}
              disabled={deleteCustomerMutation.isPending}
            >
              {deleteCustomerMutation.isPending && <PageLoader />}
              {deleteCustomerMutation.isPending
                ? "Moving to Deleted…"
                : "Move to Deleted"}
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
            <Trash className="mr-2 size-4" aria-hidden="true" />
            Move to Deleted ({customer?.first_name})
          </Button>
        </DrawerTrigger>
      ) : null}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-black">
            Soft delete — move to deleted list?
          </DrawerTitle>
          <DrawerDescription>
            This is not a permanent delete. The customer will be moved to your
            deleted list and can be restored anytime from the &quot;Soft Deleted&quot;
            filter. Your system never permanently deletes customers from here.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="gap-2 sm:space-x-0">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
          <Button
            aria-label="Delete selected customer"
            variant="destructive"
            onClick={onDelete}
            disabled={deleteCustomerMutation.isPending}
          >
            {deleteCustomerMutation.isPending && <PageLoader />}
            {deleteCustomerMutation.isPending
              ? "Moving to Deleted..."
              : "Move to Deleted"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
