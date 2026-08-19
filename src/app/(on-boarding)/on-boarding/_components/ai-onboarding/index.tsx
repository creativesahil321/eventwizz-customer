"use client";

import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AICollectInfo from "./collect-info";
import AIOnboardingBuilding from "./building";
import { useAIOnboarding } from "../../_lib/hooks/useAIOnboarding";
import type { AIOnboardingInput } from "@/app/api/ai/generate-onboarding/route";

interface AIOnboardingFlowProps {
  onComplete: () => void;
  onSwitchToManual: () => void;
  /** From GET persistence: `null` = never set → show location gate; `true`/`false` = skip gate. */
  persistedHasMultipleLocations: boolean | null;
  /** From GET persistence: `null` = unknown; otherwise pre-lock room-system choice. */
  persistedHasRoomSystem: boolean | null;
  /** Existing room names from persistence (e.g. stepFour.rooms keys). */
  persistedRoomNames: string[];
}

export default function AIOnboardingFlow({
  onComplete,
  onSwitchToManual,
  persistedHasMultipleLocations,
  persistedHasRoomSystem,
  persistedRoomNames,
}: AIOnboardingFlowProps) {
  const {
    step,
    content,
    error,
    isGenerating,
    generateContent,
    setStep,
    setError,
    reset,
  } = useAIOnboarding();
  const [venueInput, setVenueInput] = useState<AIOnboardingInput | null>(null);

  const handleCollectComplete = async (input: AIOnboardingInput) => {
    setVenueInput(input);
    await generateContent(input);
  };

  const handleRetry = async () => {
    if (venueInput) {
      await generateContent(venueInput);
    }
  };

  const handleAIApplyComplete = () => {
    onComplete();
  };

  const handleApplyFailed = useCallback(
    (message: string) => {
      setError(message);
      setStep("error");
    },
    [setError, setStep],
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient effects using theme colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse"
          style={{ backgroundColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent)` }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse"
          style={{ backgroundColor: `color-mix(in srgb, var(--color-secondary, #8b5cf6) 10%, transparent)` }}
        />
      </div>

      <AnimatePresence mode="wait">
        {(step === "idle" || step === "collecting") && (
          <motion.div
            key="collect"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <AICollectInfo
              onSubmit={handleCollectComplete}
              onSwitchToManual={onSwitchToManual}
              isLoading={isGenerating}
              initialData={venueInput}
              persistedHasMultipleLocations={persistedHasMultipleLocations}
              persistedHasRoomSystem={persistedHasRoomSystem}
              persistedRoomNames={persistedRoomNames}
            />
          </motion.div>
        )}

        {(step === "generating" ||
          (step === "applying" && content && venueInput)) && (
          <motion.div
            key="building"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            <AIOnboardingBuilding
              phase={step === "applying" ? "applying" : "generating"}
              venueName={venueInput?.venueName || ""}
              hasMultipleLocations={venueInput?.has_multiple_locations === true}
              content={content}
              venueInput={venueInput}
              onComplete={handleAIApplyComplete}
              onApplyFailed={handleApplyFailed}
            />
          </motion.div>
        )}

        {step === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center min-h-screen"
          >
            <div className="relative z-10 text-center max-w-md mx-auto px-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">!</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                {step === "error" && content ? "Setup Failed" : "Generation Failed"}
              </h2>
              <p className="text-slate-400 mb-6 text-sm">{error}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleRetry}
                  className="px-6 py-2.5 rounded-full text-white text-sm font-medium transition-colors"
                  style={{ background: `var(--color-primary, #3b82f6)` }}
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    reset();
                    setStep("collecting");
                  }}
                  className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={onSwitchToManual}
                  className="px-6 py-2.5 rounded-full text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Switch to Manual
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
