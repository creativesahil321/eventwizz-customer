"use client";

import { useState, useEffect, useRef } from "react";
import { FormProvider } from "./_components/form-provider";
import FormLayoutProvider from "./_components/form-layout";

import { useOnboardingData } from "./_lib/hooks/useOnboardingData";
import { ApiResponse } from "@/services/vendor/onboarding/type";
import ModeSelection from "./_components/mode-selection";
import AIOnboardingFlow from "./_components/ai-onboarding";

type OnboardingMode = "selecting" | "ai" | "manual";

const MODE_STORAGE_KEY = "onboarding_mode";

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

  // 2. When persistence API data arrives: check for DB-persisted mode first,
  //    then fall back to the "has completed a step" heuristic.
  //    Only runs once (modeResolved guard) to avoid overwriting user's live choice.
  useEffect(() => {
    if (!onboardingData?.data || modeResolved.current === false) return;

    const data = onboardingData.data as unknown as Record<string, unknown>;

    // Prefer the DB-persisted mode returned by GET /vendor/onboarding/steps/{id}
    const persistedMode = data.mode as string | undefined;
    if (persistedMode === "ai" || persistedMode === "manual") {
      // Only apply if we haven't already resolved from sessionStorage
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
    // Mode is already persisted via step payloads.
    sessionStorage.setItem(MODE_STORAGE_KEY, "manual");
    setMode("manual");
  };

  const handleSwitchToManual = () => {
    sessionStorage.setItem(MODE_STORAGE_KEY, "manual");
    setMode("manual");
  };

  if (isLoading) {
    return <AILoadingSkeleton />;
  }

  if (mode === "selecting") {
    return <ModeSelection onSelectMode={handleModeSelect} />;
  }

  const safeData: ApiResponse | null = onboardingData || null;

  return (
    <FormProvider serverData={safeData} mode={mode as "ai" | "manual"}>
      {mode === "ai" ? (
        <AIOnboardingFlow
          onComplete={handleAIComplete}
          onSwitchToManual={handleSwitchToManual}
        />
      ) : (
        <FormLayoutProvider />
      )}
    </FormProvider>
  );
}
