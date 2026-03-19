"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AIEventCollectInfo from "./collect-info";
import AIEventGenerating from "./generating";
import AIEventReviewContent from "./review-content";
import { useAIEventCreation } from "../../_lib/hooks/useAIEventCreation";
import type { AIEventInput } from "@/app/api/ai/generate-event/route";

interface AIEventCreationFlowProps {
  onComplete: (eventId: number) => void;
  onSwitchToManual: () => void;
  venueInfo?: { name?: string; city?: string; address?: string };
}

export default function AIEventCreationFlow({
  onComplete,
  onSwitchToManual,
  venueInfo,
}: AIEventCreationFlowProps) {
  const { step, content, error, isGenerating, generateContent, setStep, reset } =
    useAIEventCreation();
  const [eventInput, setEventInput] = useState<AIEventInput | null>(null);
  const [categoryId, setCategoryId] = useState<number>(0);

  const handleCollectComplete = async (input: AIEventInput, catId: number) => {
    setEventInput(input);
    setCategoryId(catId);
    await generateContent(input);
  };

  const handleRetry = async () => {
    if (eventInput) {
      await generateContent(eventInput);
    }
  };

  return (
    <div className="relative min-h-screen min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse"
          style={{ backgroundColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse"
          style={{ backgroundColor: "color-mix(in srgb, var(--color-secondary, #8b5cf6) 10%, transparent)" }}
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
            <AIEventCollectInfo
              onSubmit={handleCollectComplete}
              onSwitchToManual={onSwitchToManual}
              isLoading={isGenerating}
              initialData={eventInput}
              venueInfo={venueInfo}
            />
          </motion.div>
        )}

        {step === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <AIEventGenerating eventName={eventInput?.eventName || ""} />
          </motion.div>
        )}

        {step === "reviewing" && content && eventInput && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <AIEventReviewContent
              content={content}
              eventInput={eventInput}
              categoryId={categoryId}
              onComplete={onComplete}
              onRegenerate={handleRetry}
              onBack={() => setStep("collecting")}
            />
          </motion.div>
        )}

        {step === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center min-h-screen py-8 px-4"
          >
            <div className="relative z-10 text-center max-w-md mx-auto w-full">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <span className="text-xl sm:text-2xl">!</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
                Generation Failed
              </h2>
              <p className="text-slate-400 mb-4 sm:mb-6 text-xs sm:text-sm break-words">{error}</p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3">
                <button
                  onClick={handleRetry}
                  className="min-h-[44px] px-6 py-2.5 rounded-full text-white text-sm font-medium transition-colors touch-manipulation"
                  style={{ background: "var(--color-primary, #3b82f6)" }}
                >
                  Try Again
                </button>
                <button
                  onClick={() => { reset(); setStep("collecting"); }}
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 transition-colors touch-manipulation"
                >
                  Go Back
                </button>
                <button
                  onClick={onSwitchToManual}
                  className="min-h-[44px] px-6 py-2.5 rounded-full text-slate-400 hover:text-white text-sm font-medium transition-colors touch-manipulation"
                >
                  Manual Setup
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
