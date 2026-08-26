"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { FormProvider } from "./_components/form-provider";
import FormLayoutProvider from "./_components/form-layout";
import { getHasMultipleLocationsChoiceFromPersistence } from "./_components/form-provider/hydrate-onboarding-from-api";
import {
  clearAIBulkApplyStarted,
  isAIBulkApplyInProgress,
} from "./_lib/ai-bulk-apply-session-flag";

import { useOnboardingData } from "./_lib/hooks/useOnboardingData";
import { ApiResponse } from "@/services/vendor/onboarding/type";
import { coerceApiBooleanOrNull } from "@/lib/coerce-api-boolean";
import ModeSelection from "./_components/mode-selection";
import AIOnboardingFlow from "./_components/ai-onboarding";
import { Skeleton } from "@/components/ui/skeleton";

type OnboardingMode = "selecting" | "ai" | "manual";

const MODE_STORAGE_KEY = "onboarding_mode";

/**
 * After the AI wizard applies, vendors continue in the manual stepper (steps 2–11).
 * If persistence still says `mode: "ai"` but step data shows they passed that phase,
 * open the manual layout so they are not sent back to “Tell us about your business”.
 */
function shouldOpenManualStepperFromPersistence(
  data: Record<string, unknown>,
): boolean {
  if (isAIBulkApplyInProgress()) return false;

  const lastCompleted = Number(
    data.last_completed_step ?? data.lastCompletedStep ?? 0,
  );
  if (Number.isFinite(lastCompleted) && lastCompleted >= 2) return true;

  const def = data.default_venue_location ?? data.defaultVenueLocation;
  if (def && typeof def === "object") {
    const o = def as Record<string, unknown>;
    const venueStep = Number(o.onboarding_step ?? o.on_boarding_step ?? 0);
    if (Number.isFinite(venueStep) && venueStep >= 2) return true;
  }

  const stepTwo = data.stepTwo ?? data.step_two;
  if (stepTwo && typeof stepTwo === "object") {
    if ((stepTwo as Record<string, unknown>).isApproved === true) return true;
  }

    return false;
}

function AILoadingSkeleton() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-4xl space-y-8">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-10 w-36 rounded-md bg-white/10" />
          <Skeleton className="h-6 w-48 rounded-full bg-white/10" />
          <Skeleton className="h-10 w-80 max-w-full rounded-md bg-white/10" />
          <Skeleton className="h-4 w-64 max-w-full rounded-md bg-white/10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-2xl bg-white/10" />
          <Skeleton className="h-72 rounded-2xl bg-white/10" />
        </div>
      </div>
    </div>
  );
}

export default function OnboardingClientWrapper() {
  const { onboardingData, isLoading } = useOnboardingData();
  const safeData: ApiResponse | null = onboardingData ?? null;
  const hasBootstrappedDataRef = useRef(false);

  const persistedHasMultipleLocations = useMemo((): boolean | null => {
    const raw = safeData?.data ?? safeData;
    if (!raw || typeof raw !== "object") return null;
    return getHasMultipleLocationsChoiceFromPersistence(
      raw as Record<string, unknown>,
    );
  }, [safeData]);

  const persistedRoomNames = useMemo((): string[] => {
    const raw = safeData?.data ?? safeData;
    if (!raw || typeof raw !== "object") return [];
    const data = raw as Record<string, unknown>;
    const stepFour = data.stepFour;
    if (!stepFour || typeof stepFour !== "object") return [];
    const rooms = (stepFour as Record<string, unknown>).rooms;
    if (!rooms || typeof rooms !== "object") return [];
    return Object.keys(rooms as Record<string, unknown>).filter(
      (name) => name.trim().length > 0,
    );
  }, [safeData]);

  const persistedHasRoomSystem = useMemo((): boolean | null => {
    const raw = safeData?.data ?? safeData;
    if (!raw || typeof raw !== "object") return null;
    const data = raw as Record<string, unknown>;
    const flag = coerceApiBooleanOrNull(data.is_rooms);
    // Room-mode leftover with no rooms should not skip the question on a new generate.
    if (flag === true && persistedRoomNames.length === 0) return null;
    return flag;
  }, [safeData, persistedRoomNames]);

  const [mode, setMode] = useState<OnboardingMode>("selecting");
  // Tracks whether we've already resolved the mode from API/sessionStorage
  // to avoid overwriting a freshly-picked mode with stale data
  const modeResolved = useRef(false);

  // 1. On mount: restore mode from sessionStorage (fast — avoids flash of mode-selection screen)
  useEffect(() => {
    const savedMode = sessionStorage.getItem(MODE_STORAGE_KEY);
    if (savedMode === "ai" || savedMode === "manual") {
      setMode(savedMode);
    }
    modeResolved.current = true;
  }, []);

  useEffect(() => {
    if (!isLoading) {
      hasBootstrappedDataRef.current = true;
    }
  }, [isLoading]);

  // Abandoned tab / completed flow: drop stale bulk-apply flag so returning vendors still get manual when appropriate.
  useEffect(() => {
    if (!isLoading && mode !== "ai") {
      clearAIBulkApplyStarted();
    }
  }, [isLoading, mode]);

  // 2. When persistence API data arrives: check for DB-persisted mode first,
  //    then fall back to the "has completed a step" heuristic.
  //    Only runs once (modeResolved guard) to avoid overwriting user's live choice.
  useEffect(() => {
    if (!onboardingData?.data || modeResolved.current === false) return;

    const data = onboardingData.data as unknown as Record<string, unknown>;

    // Prefer the DB-persisted mode returned by GET /vendor/onboarding/steps/{id}
    const persistedMode = data.mode as string | undefined;
    if (persistedMode === "ai" || persistedMode === "manual") {
      const forceManual =
        persistedMode === "ai" &&
        shouldOpenManualStepperFromPersistence(data);
      if (forceManual) {
        setMode("manual");
        sessionStorage.setItem(MODE_STORAGE_KEY, "manual");
        return;
      }

      const sessionMode = sessionStorage.getItem(MODE_STORAGE_KEY);
      if (!sessionMode) {
        setMode(persistedMode);
        sessionStorage.setItem(MODE_STORAGE_KEY, persistedMode);
      }
      return;
    }

    // Fallback: if vendor has completed at least one step, jump directly to manual form
    const currentStep = Number(
      data.active_step || data.activeStep || data.current_step || data.on_boarding_step || 0
    );
    if (currentStep >= 1) {
      const sessionMode = sessionStorage.getItem(MODE_STORAGE_KEY);
      if (!sessionMode) {
        setMode("manual");
        sessionStorage.setItem(MODE_STORAGE_KEY, "manual");
      }
    }
  }, [onboardingData]);

  // 3. When vendor picks a mode — store locally only (no API call yet)
  const handleModeSelect = (selected: "ai" | "manual") => {
    setMode(selected);
    sessionStorage.setItem(MODE_STORAGE_KEY, selected);
  };

  const handleAIComplete = () => {
    // AI flow is complete, switch to manual onboarding UI.
    // Mode is already persisted via step payloads. Keep the form panel
    // open so the vendor can review and approve the draft immediately.
    sessionStorage.setItem(MODE_STORAGE_KEY, "manual");
    setMode("manual");
  };

  const handleSwitchToManual = () => {
    clearAIBulkApplyStarted();
    sessionStorage.setItem(MODE_STORAGE_KEY, "manual");
    setMode("manual");
  };

  const handleBackToMode = () => {
    clearAIBulkApplyStarted();
    sessionStorage.removeItem(MODE_STORAGE_KEY);
    setMode("selecting");
  };

  // Only block with the full-page skeleton during the very first bootstrap load.
  // During later refetches (especially AI auto-apply step saves), keep current UI mounted
  // to avoid dropping back to the collect screen.
  if (isLoading && !hasBootstrappedDataRef.current) {
    return <AILoadingSkeleton />;
  }

  if (mode === "selecting") {
    return <ModeSelection onSelectMode={handleModeSelect} />;
  }

  return (
    <FormProvider serverData={safeData} mode={mode as "ai" | "manual"}>
      {mode === "ai" ? (
        <AIOnboardingFlow
          onComplete={handleAIComplete}
          onSwitchToManual={handleSwitchToManual}
          onBackToMode={handleBackToMode}
          persistedHasMultipleLocations={persistedHasMultipleLocations}
          persistedHasRoomSystem={persistedHasRoomSystem}
          persistedRoomNames={persistedRoomNames}
        />
      ) : (
        <FormLayoutProvider />
      )}
    </FormProvider>
  );
}
