"use client";

import { useSession } from "next-auth/react";
import { TypeToConfirmDeleteDialog } from "@/components/modals/type-to-confirm-delete-dialog";
import { useDeleteLocation } from "../_lib/queries";
import type { Location } from "../_lib/types";

const CONFIRM_PHRASE = "delete this location";

interface DeleteLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location;
}

export default function DeleteLocationDialog({
  open,
  onOpenChange,
  location,
}: DeleteLocationDialogProps) {
  const { data: session } = useSession();
  const { mutateAsync: deleteLocation, isPending } = useDeleteLocation();
  const accountEmail = session?.user?.email?.trim() || "";
  const resourceLabel =
    location.city?.trim() || location.name?.trim() || `Location #${location.id}`;

  const handleConfirm = async () => {
    try {
      await deleteLocation(location.id);
      onOpenChange(false);
    } catch {
      // api-client interceptor surfaces the error toast
    }
  };

  return (
    <TypeToConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete location"
      description={
        <>
          <p>
            This will permanently delete{" "}
            <span className="font-semibold text-foreground">{resourceLabel}</span>
            {location.address ? (
              <>
                {" "}
                (<span className="break-words">{location.address}</span>)
              </>
            ) : null}
            .
          </p>
          <p>
            All events, bookings, and everything else linked to this location
            will be permanently removed. You cannot recover any of it later.
            Default locations cannot be deleted.
          </p>
        </>
      }
      resourceLabel={resourceLabel}
      warning={
        <>
          Warning: deleting{" "}
          <span className="font-semibold">{resourceLabel}</span> will
          permanently remove all related events, bookings, and linked data.
          This cannot be undone or recovered.
        </>
      }
      confirmEmail={accountEmail}
      confirmPhrase={CONFIRM_PHRASE}
      confirmButtonLabel="Delete location"
      isPending={isPending}
      onConfirm={handleConfirm}
    />
  );
}
