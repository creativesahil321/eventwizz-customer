"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import type {
  AIGeneratedContent,
  AIOnboardingInput,
} from "@/app/api/ai/generate-onboarding/route";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useFormContext } from "../form-provider";
import {
  AI_ONBOARDING_APPLY_STEPS,
  applyAIGeneratedOnboardingContent,
} from "../../_lib/apply-ai-onboarding-content";

const themeAccent = {
  text: { color: `var(--color-primary, #3b82f6)` } as React.CSSProperties,
  loaderBox: {
    backgroundColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent)`,
    borderColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 30%, transparent)`,
  } as React.CSSProperties,
};

interface AIAutoApplyProps {
  content: AIGeneratedContent;
  venueInput: AIOnboardingInput;
  onComplete: () => void;
  onApplyFailed: () => void;
}

export default function AIAutoApply({
  content,
  venueInput,
  onComplete,
  onApplyFailed,
}: AIAutoApplyProps) {
  const { form: globalForm, setActiveStep } = useFormContext();
  const { update } = useSession();
  const [applyStep, setApplyStep] = useState(-1);
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
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        const p = latestRef.current;
        await applyAIGeneratedOnboardingContent({
          content: p.content,
          venueInput: p.venueInput,
          removedSections: new Set<string>(),
          globalForm: p.globalForm,
          setActiveStep: p.setActiveStep,
          updateSession: (data) => p.update(data) as Promise<unknown>,
          onApplyStepChange: setApplyStep,
        });

        toast.success(
          "Your site has been created! We opened the Site step so you can preview branding right away—review the other steps when you are ready, then continue to payments and publishing.",
        );
        latestRef.current.onComplete();
      } catch (error) {
        console.error("Error applying AI content:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to apply content. Please try again.",
        );
        latestRef.current.onApplyFailed();
      } finally {
        setApplyStep(-1);
      }
    };

    void run();
  }, []);

  const totalSteps = AI_ONBOARDING_APPLY_STEPS.length;
  const progressPct =
    applyStep < 0
      ? 0
      : Math.min(Math.round(((applyStep + 1) / totalSteps) * 100), 100);

  return (
    <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-4"
            style={themeAccent.loaderBox}
          >
            <Loader2 className="w-7 h-7" style={themeAccent.text} />
          </motion.div>
          <h2 className="text-xl font-bold text-white">Building your site</h2>
          <p className="text-slate-500 text-xs mt-1">
            Please don&apos;t close this page
          </p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-500">Progress</span>
            <span className="text-xs font-semibold" style={themeAccent.text}>
              {progressPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `var(--color-primary, #3b82f6)` }}
              initial={{ width: "0%" }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {AI_ONBOARDING_APPLY_STEPS.map((step, idx) => {
            const isDone = idx < applyStep;
            const isActive = idx === applyStep;
            const isPending = idx > applyStep;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
                  isActive
                    ? "bg-white/6 border border-white/10"
                    : "bg-transparent"
                }`}
              >
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                  {isDone ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
                    >
                      <Check className="w-3 h-3 text-green-400" />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Loader2 className="w-4 h-4" style={themeAccent.text} />
                    </motion.div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/15" />
                  )}
                </div>
                <span className="text-sm mr-1">{step.icon}</span>
                <span
                  className={`text-sm font-medium ${isDone ? "text-slate-400" : isActive ? "text-white" : "text-slate-600"}`}
                >
                  {step.label}
                </span>
                {isDone && (
                  <span className="ml-auto text-[10px] text-green-500 font-medium">
                    Done
                  </span>
                )}
                {isActive && (
                  <span
                    className="ml-auto text-[10px] font-medium"
                    style={themeAccent.text}
                  >
                    Saving...
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
