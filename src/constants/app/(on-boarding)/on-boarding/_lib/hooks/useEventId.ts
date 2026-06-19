"use client";

import { useSession } from "next-auth/react";
import { UseFormReturn } from "react-hook-form";
import { OnboardingFormData } from "../../_components/form-provider/schema";

/**
 * Custom hook to reliably get event_id from multiple sources with fallback priority
 *
 * Priority order:
 * 1. globalForm (most reliable - set by Step 3 after successful save)
 * 2. Previous steps in globalForm (stepFour, stepThree)
 * 3. Session (may have race condition delays)
 *
 * This hook solves the race condition where session updates happen asynchronously
 * while users navigate through onboarding steps quickly.
 *
 * @param globalForm - The global form instance from FormProvider
 * @param stepName - Optional step name to check first (e.g., "stepFour", "stepThree")
 * @returns The event_id as a number, or 0 if not found
 */
export function useEventId(
  globalForm: UseFormReturn<OnboardingFormData>,
  stepName?: string
): number {
  const { data: session } = useSession();

  // Helper to safely get event_id from globalForm (event_id not in schema by design)
  const getFormEventId = (path: string): number | undefined => {
    try {
      const value = (globalForm.getValues as (key: string) => unknown)(path);
      return value && Number(value) > 0 ? Number(value) : undefined;
    } catch {
      return undefined;
    }
  };

  // Priority 1: Check the specified step first (if provided)
  if (stepName) {
    const stepEventId = getFormEventId(`${stepName}.event_id`);
    if (stepEventId) {
      return stepEventId;
    }
  }

  // Priority 2: Check stepFour (set by Step 3 after successful save)
  const stepFourEventId = getFormEventId("stepFour.event_id");
  if (stepFourEventId) {
    return stepFourEventId;
  }

  // Priority 3: Check stepThree (set by Step 3 after successful save)
  const stepThreeEventId = getFormEventId("stepThree.event_id");
  if (stepThreeEventId) {
    return stepThreeEventId;
  }

  // Priority 4: Fall back to session
  const sessionEventId = session?.user?.event_id;
  if (sessionEventId && Number(sessionEventId) > 0) {
    return Number(sessionEventId);
  }

  return 0;
}

/**
 * Helper function to set event_id in globalForm (for use in Step 3 after successful save)
 *
 * @param globalForm - The global form instance from FormProvider
 * @param eventId - The event_id to store
 * @param steps - Array of step names to store event_id in (default: ["stepThree", "stepFour"])
 */
export function setEventIdInForm(
  globalForm: UseFormReturn<OnboardingFormData>,
  eventId: number,
  steps: string[] = ["stepThree", "stepFour"]
): void {
  const setFormEventId = globalForm.setValue as (
    key: string,
    value: unknown
  ) => void;

  steps.forEach((step) => {
    setFormEventId(`${step}.event_id`, eventId);
  });
}
