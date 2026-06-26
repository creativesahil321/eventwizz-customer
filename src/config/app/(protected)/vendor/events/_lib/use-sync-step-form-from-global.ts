"use client";

import { useEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { EventSchemaType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import {
  buildStepSyncFingerprint,
  type EventFormStepKey,
} from "./sync-step-form-utils";

/**
 * Hydrates a tab-local react-hook-form from the global event form once persistence loads.
 * Local forms stay authoritative during edit (no global watch — avoids reset loops).
 */
export function useSyncStepFormFromGlobal<
  K extends EventFormStepKey,
  T extends FieldValues,
>({
  globalForm,
  localForm,
  stepKey,
  toLocalValues,
  onAfterSync,
  enabled = true,
}: {
  globalForm: UseFormReturn<EventSchemaType>;
  localForm: UseFormReturn<T>;
  stepKey: K;
  toLocalValues: (globalStep: EventSchemaType[K]) => T;
  onAfterSync?: (values: T) => void;
  enabled?: boolean;
}) {
  const toLocalValuesRef = useRef(toLocalValues);
  toLocalValuesRef.current = toLocalValues;
  const onAfterSyncRef = useRef(onAfterSync);
  onAfterSyncRef.current = onAfterSync;
  const lastSyncedFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    if (enabled === false) {
      lastSyncedFingerprintRef.current = null;
      return;
    }

    const globalStep = globalForm.getValues()[stepKey];
    const fingerprint = buildStepSyncFingerprint(stepKey, globalStep);
    if (!fingerprint || lastSyncedFingerprintRef.current === fingerprint) {
      return;
    }

    lastSyncedFingerprintRef.current = fingerprint;
    const nextValues = toLocalValuesRef.current(
      globalStep as EventSchemaType[K],
    );
    localForm.reset(nextValues, { keepDefaultValues: false });
    onAfterSyncRef.current?.(nextValues);
  }, [enabled, globalForm, localForm, stepKey]);
}
