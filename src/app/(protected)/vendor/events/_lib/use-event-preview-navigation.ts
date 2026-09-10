"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useEventFormContext } from "../_components/events-form-provider";
import { getEventPreviewUrl, openEventPreviewTab } from "./open-event-preview-tab";
import { writeVendorEventIsRoomsFlag } from "./vendor-event-is-rooms";
import {
  clearVendorEventPreviewDraft,
  writeVendorEventPreviewDraft,
} from "./vendor-event-preview-live-data";
import { parseEventIsRoomsFlag } from "@/lib/event-form-limits";

export function useEventPreviewNavigation() {
  const { form, hasUnsavedEventEdits } = useEventFormContext();
  const params = useParams<{ eventID: string }>();
  const eventIdFromUrl = Array.isArray(params?.eventID)
    ? params?.eventID[0]
    : params?.eventID;
  const eventIdFromForm = Number(form.getValues().stepOne?.event_id) || 0;
  const eventId = eventIdFromForm > 0 ? eventIdFromForm : Number(eventIdFromUrl) || 0;

  const openEventPreview = useCallback(() => {
    if (!eventId || eventId <= 0) {
      toast.error("Save the event name step first to preview.");
      return;
    }

    const isRoomsEnabled =
      parseEventIsRoomsFlag(form.getValues().stepTwo?.is_rooms) === 1 ||
      parseEventIsRoomsFlag(form.getValues().stepOne?.is_rooms) === 1;

    writeVendorEventIsRoomsFlag(eventId, isRoomsEnabled);
    if (hasUnsavedEventEdits) {
      writeVendorEventPreviewDraft(eventId, form.getValues());
    } else {
      void clearVendorEventPreviewDraft(eventId);
    }

    // Must open synchronously on click — `await` before window.open() makes browsers
    // treat the new tab as a popup and block it.
    const opened = openEventPreviewTab(eventId, isRoomsEnabled);
    if (!opened) {
      toast.error("Could not open preview in a new tab.", {
        description: `Allow pop-ups for this site, or paste: ${getEventPreviewUrl(eventId, isRoomsEnabled)}`,
      });
    }
  }, [eventId, form, hasUnsavedEventEdits]);

  return {
    openEventPreview,
    canPreview: eventId > 0,
  };
}
