"use client";

import { useEffect } from "react";
import { FormProvider } from "../_components/events-form-provider";
import TabEventForm from "../_components/tab-event-form";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useEventData } from "../_lib/hooks/useEventData";
import {
  resolveVendorEventIsRoomsForFetch,
  writeVendorEventIsRoomsFlag,
} from "../_lib/vendor-event-is-rooms";
import { parseEventIsRoomsFlag } from "@/lib/event-form-limits";
import { EventApiResponse } from "@/services/vendor/events/type";

interface EventClientWrapperProps {
  eventId: string;
}

export default function EventClientWrapper({
  eventId,
}: EventClientWrapperProps) {
  const isRoomsForFetch = resolveVendorEventIsRoomsForFetch(eventId);
  const { eventData, isLoading } = useEventData(eventId, isRoomsForFetch);

  useEffect(() => {
    if (!eventData?.data || !eventId) return;
    const payload = eventData.data as {
      is_rooms?: boolean | number | string;
      stepOne?: { is_rooms?: boolean | number | string };
      stepTwo?: { is_rooms?: boolean | number | string };
    };
    writeVendorEventIsRoomsFlag(
      eventId,
      parseEventIsRoomsFlag(
        payload.is_rooms ?? payload.stepTwo?.is_rooms ?? payload.stepOne?.is_rooms,
      ) === 1,
    );
  }, [eventData, eventId]);

  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={6}
        cellWidths={["10rem", "40rem", "12rem", "12rem", "8rem", "8rem"]}
        shrinkZero
      />
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
