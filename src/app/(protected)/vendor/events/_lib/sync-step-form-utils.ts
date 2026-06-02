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

export function buildStepSyncFingerprint(
  stepKey: EventFormStepKey,
  globalStep: EventSchemaType[EventFormStepKey],
): string | null {
  if (!canSyncStepFromGlobal(stepKey, globalStep)) return null;

  if (stepKey === "stepOne") {
    const stepOne = globalStep as EventSchemaType["stepOne"];
    return `${Number(stepOne.event_id) || 0}:${String(stepOne.event_name || "").trim()}:${stepOne.event_category_id}`;
  }

  if (stepKey === "stepTwo") {
    const stepTwo = globalStep as EventSchemaType["stepTwo"];
    return `${Number(stepTwo.event_id) || 0}:${stepTwo.is_rooms}:${String(stepTwo.package_title || "")}`;
  }

  return JSON.stringify(globalStep);
}
