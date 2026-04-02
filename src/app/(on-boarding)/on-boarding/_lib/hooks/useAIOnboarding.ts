"use client";

import { useState, useCallback } from "react";
import type {
  AIOnboardingInput,
  AIGeneratedContent,
} from "@/app/api/ai/generate-onboarding/route";

export type AIOnboardingStep =
  | "idle"
  | "collecting"
  | "generating"
  | "applying"
  | "error";

interface UseAIOnboardingReturn {
  step: AIOnboardingStep;
  content: AIGeneratedContent | null;
  error: string | null;
  isGenerating: boolean;
  generateContent: (input: AIOnboardingInput) => Promise<AIGeneratedContent | null>;
  setStep: (step: AIOnboardingStep) => void;
  reset: () => void;
}

export function useAIOnboarding(): UseAIOnboardingReturn {
  const [step, setStep] = useState<AIOnboardingStep>("idle");
  const [content, setContent] = useState<AIGeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateContent = useCallback(
    async (input: AIOnboardingInput): Promise<AIGeneratedContent | null> => {
      setIsGenerating(true);
      setError(null);
      setStep("generating");

      try {
        const response = await fetch("/api/ai/generate-onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Generation failed (${response.status})`
          );
        }

        const data = await response.json();

        if (!data.content) {
          throw new Error("No content received from AI");
        }

        setContent(data.content);
        setStep("applying");
        return data.content;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to generate content";
        setError(message);
        setStep("error");
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStep("idle");
    setContent(null);
    setError(null);
    setIsGenerating(false);
  }, []);

  return {
    step,
    content,
    error,
    isGenerating,
    generateContent,
    setStep,
    reset,
  };
}
