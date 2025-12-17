"use client";

import { FormProvider } from "../_components/events-form-provider";
import TabEventForm from "../_components/tab-event-form";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useEventData } from "../_lib/hooks/useEventData";
import { EventApiResponse } from "@/services/vendor/events/type";

interface EventClientWrapperProps {
  eventId: string;
}

export default function EventClientWrapper({
  eventId,
}: EventClientWrapperProps) {
  const { eventData, isLoading } = useEventData(eventId);

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
    <FormProvider serverData={safeData}>
      <TabEventForm />
    </FormProvider>
  );
}
