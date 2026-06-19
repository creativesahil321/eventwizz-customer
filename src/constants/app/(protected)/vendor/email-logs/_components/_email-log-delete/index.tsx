"use client";

import { Trash } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import { EmailLog } from "../../_lib/types";
import { PageLoader } from "@/components/ui/page-loader";
import { useDeleteEmailLog } from "../../_lib/queries";

interface DeleteEmailDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  email: EmailLog | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}

export function DeleteEmailDialog({
  email,
  showTrigger = true,
  onSuccess,
  ...props
}: DeleteEmailDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const deleteEmailLogMutation = useDeleteEmailLog();

  function onDelete() {
    if (!email?.id) {
      return;
    }

    deleteEmailLogMutation.mutate(email.id, {
      onSuccess: (response) => {
        if (response.status) {
          props.onOpenChange?.(false);
          onSuccess?.();
        }
        // Error handling is done by API interceptor
      },
      onError: () => {
        // Error handling is done by API interceptor
      },
    });
  }

  if (isDesktop) {
    return (
      <Dialog {...props}>
        {showTrigger ? (
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Trash className="mr-2 size-4" aria-hidden="true" />
              Delete Email
            </Button>
          </DialogTrigger>
        ) : null}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete you
              email from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <DialogClose asChild>
              <Button variant="event-outline">Cancel</Button>
            </DialogClose>
            <Button
              aria-label="Delete selected rows"
              variant="destructive"
              onClick={onDelete}
              disabled={deleteEmailLogMutation.isPending || !email?.id}
            >
              {deleteEmailLogMutation.isPending && <PageLoader />}
              Delete
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
          <Button variant="outline" size="sm">
            <Trash className="mr-2 size-4" aria-hidden="true" />
            Delete Email
          </Button>
        </DrawerTrigger>
      ) : null}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Are you absolutely sure?</DrawerTitle>
          <DrawerDescription>
            This action cannot be undone. This will permanently delete you email
            from our servers.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="gap-2 sm:space-x-0">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
          <Button
            aria-label="Delete selected rows"
            variant="destructive"
            onClick={onDelete}
            disabled={deleteEmailLogMutation.isPending || !email?.id}
          >
            {deleteEmailLogMutation.isPending && <PageLoader />}
            Delete
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
