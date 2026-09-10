import type { EventSchemaType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";

export type EventFormStepKey = Exclude<keyof EventSchemaType, "currentStep">;

export function canSyncStepFromGlobal(
  stepKey: EventFormStepKey,
  globalStep: EventSchemaType[EventFormStepKey],
): boolean {
  if (!globalStep || typeof globalStep !== "object") return false;

  if (stepKey === "stepOne") {
    const stepOne = globalStep as EventSchemaType["stepOne"];
    const eventName = String(stepOne.event_name || "").trim();
    const eventId = Number(stepOne.event_id) || 0;
    return eventName.length > 0 || eventId > 0;
  }

  if (stepKey === "stepTwo") {
    const eventId = Number((globalStep as EventSchemaType["stepTwo"]).event_id) || 0;
    return eventId > 0;
  }

  return true;
}

function mediaSyncToken(value: unknown): string {
  if (typeof File !== "undefined" && value instanceof File) {
    return `file:${value.name}:${value.size}:${value.lastModified}`;
  }
  if (typeof value === "string" && value.trim()) {
    return `url:${value.trim()}`;
  }
  if (Array.isArray(value)) {
    return value.map((item) => mediaSyncToken(item)).join(",");
  }
  return "none";
}

export function buildStepSyncFingerprint(
  stepKey: EventFormStepKey,
  globalStep: EventSchemaType[EventFormStepKey],
): string | null {
  if (!canSyncStepFromGlobal(stepKey, globalStep)) return null;

  if (stepKey === "stepOne") {
    const stepOne = globalStep as EventSchemaType["stepOne"];
    return [
      Number(stepOne.event_id) || 0,
      String(stepOne.event_name || "").trim(),
      String(stepOne.event_banner_heading || "").trim(),
      String(stepOne.event_banner_sub_heading || "").trim(),
      stepOne.event_category_id,
      mediaSyncToken(stepOne.event_banner_image),
      mediaSyncToken(stepOne.event_banner_video),
      mediaSyncToken(stepOne.about_event_image),
      stepOne.remove_event_banner_image ? 1 : 0,
      stepOne.remove_event_banner_video ? 1 : 0,
      stepOne.remove_about_event_image ? 1 : 0,
    ].join(":");
  }

  if (stepKey === "stepTwo") {
    const stepTwo = globalStep as EventSchemaType["stepTwo"];
    return [
      Number(stepTwo.event_id) || 0,
      stepTwo.is_rooms,
      String(stepTwo.package_title || ""),
      mediaSyncToken(stepTwo.package_image),
      mediaSyncToken(stepTwo.gallery),
    ].join(":");
  }

  return JSON.stringify(globalStep);
}
