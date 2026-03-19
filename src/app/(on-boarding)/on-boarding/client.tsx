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
  const modeResolved = useRef(false);

  useEffect(() => {
    const savedMode = sessionStorage.getItem(MODE_STORAGE_KEY);
    if (savedMode === "ai" || savedMode === "manual") {
      setMode(savedMode);
    }
    modeResolved.current = true;
  }, []);

  useEffect(() => {
    if (onboardingData?.data) {
      const data = onboardingData.data as unknown as Record<string, unknown>;
      const currentStep = Number(data.active_step || data.activeStep || data.current_step || data.on_boarding_step || 0);
      // If vendor has completed any step, skip mode selection and go straight to the form
      if (currentStep >= 1) {
        setMode("manual");
        sessionStorage.setItem(MODE_STORAGE_KEY, "manual");
      }
    }
  }, [onboardingData]);

  const handleModeSelect = (selected: "ai" | "manual") => {
    setMode(selected);
    sessionStorage.setItem(MODE_STORAGE_KEY, selected);
  };

  const handleAIComplete = () => {
    // After AI apply, always go to manual form — never back to mode selection
    sessionStorage.setItem(MODE_STORAGE_KEY, "manual");
    setMode("manual");
  };

  const handleSwitchToManual = () => {
    // Go directly to manual form — never back to mode selection once a choice was made
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
    <FormProvider serverData={safeData} mode={mode === "selecting" ? undefined : mode}>
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
