import { coerceApiBoolean } from "@/lib/coerce-api-boolean";

export type VendorEventLifecycle = {
  isLive: boolean;
  hasBookings: boolean;
  /** Room system / drinks / catering Yes-No must stay put. */
  lockStructure: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Unwrap `{ data: event }` or `{ data: { data: event } }` persistence GET shapes. */
export function unwrapEventPersistenceRoot(
  payload: unknown,
): Record<string, unknown> | null {
  const outer = asRecord(payload);
  if (!outer) return null;

  const nested = asRecord(outer.data);
  if (
    nested &&
    ("is_live" in nested ||
      "has_bookings" in nested ||
      "stepOne" in nested ||
      "stepEight" in nested)
  ) {
    const inner = asRecord(nested.data);
    if (
      inner &&
      ("is_live" in inner || "has_bookings" in inner || "stepOne" in inner)
    ) {
      return inner;
    }
    return nested;
  }

  return outer;
}

export function resolveVendorEventLifecycle(
  payload: unknown,
): VendorEventLifecycle {
  const root = unwrapEventPersistenceRoot(payload);
  const isLive = coerceApiBoolean(root?.is_live) === true;
  const hasBookings = coerceApiBoolean(root?.has_bookings) === true;
  return {
    isLive,
    hasBookings,
    lockStructure: isLive || hasBookings,
  };
}

export function isVendorEventStructureLocked(source: {
  is_live?: unknown;
  has_bookings?: unknown;
}): boolean {
  return (
    coerceApiBoolean(source.is_live) === true ||
    coerceApiBoolean(source.has_bookings) === true
  );
}

export function vendorEventStructureLockMessage(
  kind: "rooms" | "drinks" | "catering",
): string {
  const noun =
    kind === "rooms"
      ? "Room system"
      : kind === "drinks"
        ? "Drinks & extras"
        : "Food choices";
  return `${noun} cannot be switched on or off because this event is live or already has bookings.`;
}

export type VendorPublishCopy = {
  statusTitle: string;
  statusDescription: string;
  activeTitle: string;
  activeDescription: string;
  draftTitle: string;
  draftDescription: string;
  actionActive: string;
  actionDraft: string;
  savingActive: string;
  savingDraft: string;
  toastActive: string;
  toastDraft: string;
  busyActive: string;
  busyDraft: string;
  duplicateKeepTitle: string;
  duplicateKeepDescription: string;
};

export function getVendorPublishCopy(isLive: boolean): VendorPublishCopy {
  if (isLive) {
    return {
      statusTitle: "Event status",
      statusDescription:
        "This event is already live. Save your edits, or take it offline.",
      activeTitle: "Keep it live",
      activeDescription: "Save changes. Customers can still book.",
      draftTitle: "Take offline",
      draftDescription:
        "Hide it from customers. You can publish again later. Existing bookings are kept.",
      actionActive: "Save live event",
      actionDraft: "Take offline",
      savingActive: "Saving your live event…",
      savingDraft: "Taking the event offline…",
      toastActive: "Live event saved.",
      toastDraft: "Event taken offline and saved as a draft.",
      busyActive: "Saving…",
      busyDraft: "Taking offline…",
      duplicateKeepTitle: "No, this location only",
      duplicateKeepDescription: "Save changes for the current venue.",
    };
  }

  return {
    statusTitle: "Publish",
    statusDescription: "Go live now, or keep working on a draft.",
    activeTitle: "Publish event",
    activeDescription: "Make it live so customers can book.",
    draftTitle: "Save as draft",
    draftDescription: "Keep it private until you are ready.",
    actionActive: "Publish event",
    actionDraft: "Save as draft",
    savingActive: "Publishing your event…",
    savingDraft: "Saving your draft…",
    toastActive: "Event published successfully.",
    toastDraft: "Draft saved successfully.",
    busyActive: "Publishing…",
    busyDraft: "Saving…",
    duplicateKeepTitle: "No, this location only",
    duplicateKeepDescription: "Finish for the current venue.",
  };
}
