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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading...</p>
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

  const persistedHasRoomSystem = useMemo((): boolean | null => {
    const raw = safeData?.data ?? safeData;
    if (!raw || typeof raw !== "object") return null;
    const data = raw as Record<string, unknown>;
    return coerceApiBooleanOrNull(data.is_rooms);
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

  // True only for the very first render after the AI wizard finishes —
  // collapses the sidebar so the vendor sees the populated preview first.
  // Reset to false immediately after that first render so step-to-step
  // transitions don't keep re-collapsing the sidebar.
  const [sidebarCollapsedAfterAI, setSidebarCollapsedAfterAI] = useState(false);

  useEffect(() => {
    if (sidebarCollapsedAfterAI) {
      // React has already committed the first paint with the sidebar closed;
      // flip back to false so future SplitLayout remounts start open.
      setSidebarCollapsedAfterAI(false);
    }
  }, [sidebarCollapsedAfterAI]);

  const handleAIComplete = () => {
    // AI flow is complete, switch to manual onboarding UI.
    // Mode is already persisted via step payloads.
    sessionStorage.setItem(MODE_STORAGE_KEY, "manual");
    setSidebarCollapsedAfterAI(true);
    setMode("manual");
  };

  const handleSwitchToManual = () => {
    clearAIBulkApplyStarted();
    sessionStorage.setItem(MODE_STORAGE_KEY, "manual");
    setMode("manual");
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
          persistedHasMultipleLocations={persistedHasMultipleLocations}
          persistedHasRoomSystem={persistedHasRoomSystem}
          persistedRoomNames={persistedRoomNames}
        />
      ) : (
        <FormLayoutProvider defaultSidebarCollapsed={sidebarCollapsedAfterAI} />
      )}
    </FormProvider>
  );
}
