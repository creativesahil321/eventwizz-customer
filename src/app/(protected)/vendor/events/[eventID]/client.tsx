"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { FormProvider } from "../_components/events-form-provider";
import TabEventForm from "../_components/tab-event-form";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Button } from "@/components/ui/button";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { useHeaderLocationId } from "@/hooks/use-header-location-id";
import { useLocationStore } from "@/store/location.store";
import { useEventData } from "../_lib/hooks/useEventData";
import {
  resolvePersistedEventIsRoomsFromPayload,
  resolveVendorEventIsRoomsForFetch,
  writeVendorEventIsRoomsFlag,
} from "../_lib/vendor-event-is-rooms";
import { EventApiResponse } from "@/services/vendor/events/type";

interface EventClientWrapperProps {
  eventId: string;
}

function resolveEventLocationId(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0;
  const root = payload as {
    vendor_location_id?: number | string;
    stepOne?: { vendor_location_id?: number | string };
    stepThree?: { vendor_location_id?: number | string };
  };
  const raw =
    root.stepOne?.vendor_location_id ??
    root.vendor_location_id ??
    root.stepThree?.vendor_location_id;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

export default function EventClientWrapper({
  eventId,
}: EventClientWrapperProps) {
  const isRoomsForFetch = resolveVendorEventIsRoomsForFetch(eventId);
  const { eventData, isLoading } = useEventData(eventId, isRoomsForFetch);
  const currentVendorLocationId = useHeaderLocationId();
  const selectedLocation = useLocationStore((s) => s.selectedLocation);

  useEffect(() => {
    if (!eventData?.data || !eventId) return;
    writeVendorEventIsRoomsFlag(
      eventId,
      resolvePersistedEventIsRoomsFromPayload(eventData.data),
    );
  }, [eventData, eventId]);

  const eventLocationId = useMemo(
    () => resolveEventLocationId(eventData?.data),
    [eventData?.data],
  );

  const locationMismatch =
    !isLoading &&
    eventLocationId > 0 &&
    currentVendorLocationId > 0 &&
    eventLocationId !== currentVendorLocationId;

  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={6}
        cellWidths={["10rem", "40rem", "12rem", "12rem", "8rem", "8rem"]}
        shrinkZero
      />
    );
  }

  if (locationMismatch) {
    const headerLocationName =
      selectedLocation?.city ||
      selectedLocation?.name ||
      `Location #${currentVendorLocationId}`;

    return (
      <div className={pageCardClassName("min-w-0")}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">
            This event belongs to another location
          </p>
          <p className="mt-1 text-amber-900/90">
            You are currently viewing {headerLocationName}. Switch back to the
            event&apos;s venue in the header to edit it, or open that
            location&apos;s events list.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/vendor/events">Back to Events</Link>
          </Button>
        </div>
      </div>
    );
  }

  const safeData: EventApiResponse | null =
    eventData as unknown as EventApiResponse | null;

  return (
    <FormProvider key={eventId} serverData={safeData}>
      <TabEventForm />
    </FormProvider>
  );
}
