"use client";

import { useState, useCallback } from "react";
import type {
  AIEventInput,
  AIEventGeneratedContent,
} from "@/app/api/ai/generate-event/route";

export type AIEventStep =
  | "idle"
  | "collecting"
  | "generating"
  | "reviewing"
  | "applying"
  | "error";

interface UseAIEventCreationReturn {
  step: AIEventStep;
  content: AIEventGeneratedContent | null;
  error: string | null;
  isGenerating: boolean;
  generateContent: (input: AIEventInput) => Promise<AIEventGeneratedContent | null>;
  setStep: (step: AIEventStep) => void;
  reset: () => void;
}

export function useAIEventCreation(): UseAIEventCreationReturn {
  const [step, setStep] = useState<AIEventStep>("idle");
  const [content, setContent] = useState<AIEventGeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateContent = useCallback(
    async (input: AIEventInput): Promise<AIEventGeneratedContent | null> => {
      setIsGenerating(true);
      setError(null);
      setStep("generating");

      try {
        const response = await fetch("/api/ai/generate-event", {
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
        setStep("reviewing");
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
