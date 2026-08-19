"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type {
  AIGeneratedContent,
  AIOnboardingInput,
} from "@/app/api/ai/generate-onboarding/route";
import { useFormContext } from "../form-provider";
import {
  AI_ONBOARDING_APPLY_STEPS,
  applyAIGeneratedOnboardingContent,
} from "../../_lib/apply-ai-onboarding-content";
import { clearAIBulkApplyStarted } from "../../_lib/ai-bulk-apply-session-flag";
import {
  BUILDING_GENERATE_HOLD_PCT,
  BuildingProgress,
} from "./building-progress";

type BuildingPhase = "generating" | "applying";

type AIOnboardingBuildingProps = {
  phase: BuildingPhase;
  venueName: string;
  hasMultipleLocations?: boolean;
  content: AIGeneratedContent | null;
  venueInput: AIOnboardingInput | null;
  onComplete: () => void;
  onApplyFailed: (message: string) => void;
};

/**
 * One progress screen for generate + save. Stays mounted so vendors never see
 * a second spinner / checklist after the AI call returns.
 */
export default function AIOnboardingBuilding({
  phase,
  venueName,
  hasMultipleLocations = false,
  content,
  venueInput,
  onComplete,
  onApplyFailed,
}: AIOnboardingBuildingProps) {
  const { form: globalForm, setActiveStep } = useFormContext();
  const { update } = useSession();
  const [applyStep, setApplyStep] = useState(-1);
  const [genProgress, setGenProgress] = useState(6);
  const startedRef = useRef(false);
  const latestRef = useRef({
    content,
    venueInput,
    globalForm,
    setActiveStep,
    update,
    onComplete,
    onApplyFailed,
  });
  latestRef.current = {
    content,
    venueInput,
    globalForm,
    setActiveStep,
    update,
    onComplete,
    onApplyFailed,
  };

  useEffect(() => {
    if (phase !== "generating") return;
    const id = window.setInterval(() => {
      setGenProgress((prev) => {
        if (prev >= BUILDING_GENERATE_HOLD_PCT) return BUILDING_GENERATE_HOLD_PCT;
        const remaining = BUILDING_GENERATE_HOLD_PCT - prev;
        return prev + Math.max(0.12, remaining * 0.018);
      });
    }, 90);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "applying") return;
    if (startedRef.current) return;
    if (!content || !venueInput) return;
    startedRef.current = true;

    const run = async () => {
      try {
        const p = latestRef.current;
        if (!p.content || !p.venueInput) return;
        await applyAIGeneratedOnboardingContent({
          content: p.content,
          venueInput: p.venueInput,
          removedSections: new Set<string>(),
          globalForm: p.globalForm,
          setActiveStep: p.setActiveStep,
          updateSession: (data) => p.update(data) as Promise<unknown>,
          onApplyStepChange: setApplyStep,
        });
        latestRef.current.onComplete();
      } catch (error) {
        console.error("Error applying AI content:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to apply AI-generated content";
        toast.error("Could not finish AI setup", {
          description: message,
          position: "top-center",
          duration: 8000,
        });
        latestRef.current.onApplyFailed(message);
      } finally {
        setApplyStep(-1);
        clearAIBulkApplyStarted();
      }
    };

    void run();
  }, [phase, content, venueInput]);

  const saveCount = AI_ONBOARDING_APPLY_STEPS.length;
  const activeIndex =
    phase === "generating" ? 0 : Math.max(applyStep, 0) + 1;
  const progress =
    phase === "generating"
      ? genProgress
      : BUILDING_GENERATE_HOLD_PCT +
        ((Math.max(applyStep, -1) + 1) / saveCount) *
          (100 - BUILDING_GENERATE_HOLD_PCT);

  return (
    <BuildingProgress
      venueName={venueName}
      hasMultipleLocations={hasMultipleLocations}
      activeIndex={activeIndex}
      progress={progress}
    />
  );
}
