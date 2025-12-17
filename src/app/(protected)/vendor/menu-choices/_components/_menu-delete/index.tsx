"use client";
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
import { Button } from "@/components/ui/button";
import { MenuChoice } from "../../_lib/types";
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
import { Trash } from "lucide-react";
import { useTransition } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useDeleteMenuAction } from "./action";
import { PageLoader } from "@/components/ui/page-loader";

interface DeleteMenuDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  menu: MenuChoice | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}
export default function DeleteMenuDialog({
  menu,
  showTrigger = false,
  ...props
}: DeleteMenuDialogProps) {
  const [isPending, startDeleteTransition] = useTransition();
  const { deleteMenu, isDeleting } = useDeleteMenuAction();
  const isDesktop = useMediaQuery("(min-width: 640px)");

  // Determine if we're in a loading state
  const isLoading = isPending || isDeleting;

  function onDelete() {
    startDeleteTransition(async () => {
      const { success } = await deleteMenu(menu);

      if (success) {
        props.onOpenChange?.(false);
        if (props.onSuccess) {
          props.onSuccess();
        }
      }
    });
  }
  if (isDesktop) {
    return (
      <Dialog {...props}>
        {showTrigger ? (
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Trash className="mr-2 size-4" aria-hidden="true" />
              Delete ({menu?.menu_name})
            </Button>
          </DialogTrigger>
        ) : null}
        <DialogContent className="border border-gray-300 dark:border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong className="font-bold">{menu?.menu_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              aria-label="Delete selected menu"
              variant="destructive"
              onClick={onDelete}
              disabled={isLoading}
            >
              {isLoading && <PageLoader />}
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
            Delete ({menu?.menu_name})
          </Button>
        </DrawerTrigger>
      ) : null}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Are you absolutely sure?</DrawerTitle>
          <DrawerDescription>
            This action cannot be undone. This will permanently delete{" "}
            <strong className="font-bold">{menu?.menu_name}</strong>.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="gap-2 sm:space-x-0">
          <DrawerClose asChild>
            <Button variant="event-outline">Cancel</Button>
          </DrawerClose>
          <Button
            aria-label="Delete selected menu"
            variant="destructive"
            onClick={onDelete}
            disabled={isLoading}
          >
            {isLoading && <PageLoader />}
            Delete
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
